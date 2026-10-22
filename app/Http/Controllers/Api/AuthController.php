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
 * bearer token and the wrapped key material the device needs.
 *
 * The DEK itself never leaves the server in this payload. The client derives
 * the KEK from the password (or opens the recovery copy with the recovery
 * key) and unwraps the DEK locally from `kdf_salt`/`wrapped_key`, exactly as
 * the web client does from its session. The server only verifies that the
 * password really unwraps the key before minting the token.
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
     * pairs a device when the password is gone. It does not replace the second
     * factor: an account with two-factor authentication still has to provide a
     * current authenticator code, otherwise a stolen recovery key would be a
     * complete bypass.
     */
    public function recoverKey(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'recovery_key' => ['required', 'string'],
            'code' => ['nullable', 'string', 'max:32'],
        ]);

        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        // Unknown accounts and accounts without recovery material fail with
        // exactly the same message as a wrong key, so this endpoint cannot be
        // used to enumerate registered email addresses.
        if ($user === null || $user->recovery_wrapped_key === null) {
            throw ValidationException::withMessages([
                'recovery_key' => __('messages.recovery.invalid-key'),
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

        $this->requireSecondFactor($user, $request->string('code')->trim()->toString());

        return response()->json($this->payload($user));
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
            // Unwrapping also verifies the account's key marker. The key is
            // not sent to the client; it only proves the password opens it.
            $this->keys->unlock($user, $password);
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'password' => __('messages.login.unwrap-failed'),
            ]);
        }

        return $this->payload($user);
    }

    /**
     * The pairing payload itself: a fresh token and the wrapped key material
     * the client keeps for offline unlocking. The DEK is intentionally absent:
     * the device derives it locally from these values and the password (or the
     * recovery key).
     *
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $token = $user->createToken('api', ['sync']);

        return [
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'key' => [
                'kdf_salt' => $user->kdf_salt,
                'wrapped_key' => $user->wrapped_key,
                'recovery_wrapped_key' => $user->recovery_wrapped_key,
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
     * Require a current authenticator code when the account has two factor on.
     *
     * The recovery key proves knowledge of a long-lived secret; it must not
     * silently downgrade an account that deliberately enabled a second factor.
     *
     * @throws ValidationException When the account needs a code and it is missing or wrong.
     */
    private function requireSecondFactor(User $user, string $code): void
    {
        if (! $user->twoFactorEnabled()) {
            return;
        }

        $secret = $user->two_factor_secret;

        if (! is_string($secret)
            || preg_match('/^\d{'.Totp::DIGITS.'}$/', $code) !== 1
            || ! $this->totp->verify($code, $secret)) {
            throw ValidationException::withMessages([
                'code' => __('messages.two_factor.invalid-code'),
            ]);
        }
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
