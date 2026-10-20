<?php

namespace App\Http\Controllers\Api;

use App\Crypto\DiaryKeyManager;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The pairing surface of the sync API.
 *
 * Login mirrors the web sign-in (password first, authenticator second) but is
 * stateless: a two-factor attempt is parked in the cache under a random id
 * instead of the session, and a successful sign-in answers with a Sanctum
 * bearer token plus the diary encryption key.
 *
 * The DEK is handed back over HTTPS only after the password (and second
 * factor) have been proven, because the offline-first app needs it to encrypt
 * and decrypt locally and to fill the X-Diary-Key header on every later
 * request. The server never stores it in the clear.
 */
class AuthController extends Controller
{
    /** How long a parked two-factor attempt stays valid, in minutes. */
    public const CHALLENGE_TTL_MINUTES = 10;

    public function __construct(
        private readonly DiaryKeyManager $keys,
        private readonly Totp $totp,
        private readonly RecoveryCodes $recovery,
    ) {}

    /**
     * Authenticate with email and password.
     *
     * A two-factor account stops at the password: the attempt is parked in the
     * cache and nothing is authenticated (and no key leaves the server) until
     * the second factor is confirmed.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();
        $password = $request->string('password')->toString();

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('messages.login.failed'),
            ]);
        }

        if ($user->twoFactorEnabled()) {
            $challengeId = (string) Str::uuid();

            Cache::put('two-factor:api:'.$challengeId, [
                'user_id' => $user->id,
                'password' => $password,
            ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

            return response()->json([
                'two_factor_required' => true,
                'challenge_id' => $challengeId,
                'expires_in' => self::CHALLENGE_TTL_MINUTES * 60,
            ]);
        }

        return response()->json($this->finish($user, $password));
    }

    /**
     * Finish a two-factor sign-in with a code from the authenticator app.
     *
     * Recovery codes are deliberately not accepted here; they go through the
     * dedicated recover endpoint so a mistyped code can never burn one.
     */
    public function twoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_id' => ['required', 'uuid'],
            'code' => ['required', 'string', 'max:32'],
        ]);

        $pending = $this->pending($request->string('challenge_id')->toString());

        if ($pending === null) {
            throw ValidationException::withMessages([
                'challenge_id' => __('messages.login.challenge-expired'),
            ]);
        }

        $secret = $pending['user']->two_factor_secret;
        $code = $request->string('code')->toString();

        if (! is_string($secret)
            || preg_match('/^\d{'.Totp::DIGITS.'}$/', $code) !== 1
            || ! $this->totp->verify($code, $secret)) {
            throw ValidationException::withMessages([
                'code' => __('messages.two_factor.invalid-code'),
            ]);
        }

        return response()->json($this->finish($pending['user'], $pending['password']));
    }

    /**
     * Finish a two-factor sign-in with a single-use recovery code.
     */
    public function recover(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_id' => ['required', 'uuid'],
            'recovery_code' => ['required', 'string', 'max:32'],
        ]);

        $pending = $this->pending($request->string('challenge_id')->toString());

        if ($pending === null) {
            throw ValidationException::withMessages([
                'challenge_id' => __('messages.login.challenge-expired'),
            ]);
        }

        if (! $this->recovery->consume($pending['user'], $request->string('recovery_code')->toString())) {
            throw ValidationException::withMessages([
                'recovery_code' => __('messages.two_factor.invalid-code'),
            ]);
        }

        return response()->json($this->finish($pending['user'], $pending['password']));
    }

    /**
     * The one-time registration, mirroring the web flow: the first account on
     * a fresh install becomes the administrator, the key material is created
     * in the same transaction as the account, and the recovery key is shown
     * exactly once (here: in this response, never stored in the clear).
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $password = $request->string('password')->toString();
        $user = new User($request->safe()->only(['name', 'email', 'password']));

        $user->is_admin = User::query()->doesntExist();

        $recoveryKey = DB::transaction(function () use ($password, $user): string {
            $user->save();

            return $this->keys->provision($user, $password);
        });

        return response()->json([
            ...$this->finish($user, $password),
            'recovery_key' => $recoveryKey,
        ], 201);
    }

    /**
     * Finish a sign-in with the one-time recovery key issued at registration.
     *
     * The recovery key wraps the same DEK as the password does, so proving it
     * is enough to pair a device when the password is gone — no second factor
     * applies, because losing the password is exactly what it is for.
     */
    public function recoverKey(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'recovery_key' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        if ($user === null || $user->recovery_wrapped_key === null) {
            throw ValidationException::withMessages([
                'email' => __('messages.recovery.no-account'),
            ]);
        }

        try {
            $dek = $this->keys->unlockWithRecoveryKey(
                $user,
                $request->string('recovery_key')->trim()->toString(),
            );
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'recovery_key' => __('messages.recovery.invalid-key'),
            ]);
        }

        return response()->json($this->payload($user, $dek));
    }

    /**
     * The authenticated account.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'two_factor_enabled' => $user->twoFactorEnabled(),
            ],
        ]);
    }

    /**
     * Revoke the token used for this request, ending that device's access.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Token revoked.']);
    }

    /**
     * Unwrap the diary key with the proven password, mint a token for the
     * sync scope and hand both to the client in one payload.
     *
     * @return array<string, mixed>
     *
     * @throws ValidationException When the password is right but the stored key material is corrupted.
     */
    private function finish(User $user, string $password): array
    {
        try {
            $dek = $this->keys->unlock($user, $password);
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'password' => __('messages.login.unwrap-failed'),
            ]);
        }

        return $this->payload($user, $dek);
    }

    /**
     * The pairing payload itself: a fresh token, the DEK (base64) and the
     * wrapped key material the client keeps for offline unlocking.
     *
     * @return array<string, mixed>
     */
    private function payload(User $user, string $dek): array
    {
        $token = $user->createToken('api', ['sync']);

        return [
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'dek' => base64_encode($dek),
            'key' => [
                'kdf_salt' => $user->kdf_salt,
                'wrapped_key' => $user->wrapped_key,
            ],
            'recovery_available' => $user->recovery_wrapped_key !== null,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
                'two_factor_enabled' => $user->twoFactorEnabled(),
            ],
        ];
    }

    /**
     * The parked two-factor attempt, or null when it expired or was already
     * used. Pulling it from the cache consumes it, so a challenge id can
     * complete exactly one sign-in.
     *
     * @return array{user: User, password: string}|null
     */
    private function pending(string $challengeId): ?array
    {
        $pending = Cache::pull('two-factor:api:'.$challengeId);

        if (! is_array($pending)
            || ! isset($pending['user_id'], $pending['password'])
            || ! is_int($pending['user_id'])
            || ! is_string($pending['password'])) {
            return null;
        }

        $user = User::query()->find($pending['user_id']);

        if ($user === null || ! $user->twoFactorEnabled()) {
            return null;
        }

        return ['user' => $user, 'password' => $pending['password']];
    }
}
