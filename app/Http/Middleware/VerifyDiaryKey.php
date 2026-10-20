<?php

namespace App\Http\Middleware;

use App\Crypto\DiaryCrypto;
use App\Crypto\TransientKey;
use App\Exceptions\DecryptionFailedException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies the data encryption key an offline client presents in the
 * `X-Diary-Key` header (base64 of exactly 32 bytes) and parks it for the
 * rest of the request.
 *
 * The stateless API keeps no session, so the DEK must arrive with every
 * request. The account stores an encrypted marker (`key_check`): the first
 * request bootstraps it with the presented key, and every later request has
 * to decrypt it back with the same key — proving the caller holds the diary
 * key before a single byte of encrypted content is touched. On success the
 * key goes into the {@see TransientKey} holder, which the diary key store
 * consults first, so the encrypted cast, the tag blind index and attachment
 * encryption all work unchanged.
 */
class VerifyDiaryKey
{
    /**
     * The plaintext the marker is wrapped with; its only job is to prove the
     * key decrypts correctly.
     */
    private const CHECK_VALUE = 'diary-key-check-v1';

    public function __construct(
        private readonly DiaryCrypto $crypto,
        private readonly TransientKey $keys,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->headers->get('X-Diary-Key');
        $dek = is_string($header) ? base64_decode($header, true) : false;

        if ($dek === false || strlen($dek) !== DiaryCrypto::DEK_BYTES) {
            abort(403, 'The X-Diary-Key header must carry the diary key as base64 of 32 bytes.');
        }

        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        if ($user->key_check === null) {
            // First contact from a client: bind the marker to this key.
            $user->forceFill([
                'key_check' => $this->crypto->encrypt(self::CHECK_VALUE, $dek),
            ])->save();
        } else {
            try {
                $check = $this->crypto->decrypt($user->key_check, $dek);
            } catch (DecryptionFailedException) {
                abort(403, 'The diary key is not valid for this account.');
            }

            if (! hash_equals(self::CHECK_VALUE, $check)) {
                abort(403, 'The diary key is not valid for this account.');
            }
        }

        $this->keys->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));

        return $next($request);
    }
}
