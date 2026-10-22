<?php

namespace App\Http\Middleware;

use App\Crypto\DiaryCrypto;
use App\Crypto\TransientKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies the data encryption key an offline client presents in the
 * `X-Diary-Key` header (base64 of exactly 32 bytes) and parks it for the
 * rest of the request.
 *
 * The stateless API keeps no session, so the DEK must arrive with every
 * request. The account stores an encrypted marker (`key_check`), created when
 * the account is provisioned; every request has to decrypt it back with the
 * presented key, proving the caller holds the diary key before a single byte
 * of encrypted content is touched. There is deliberately no first-contact
 * bootstrap: accepting the first key an unauthenticated caller presents would
 * let anyone bind the account to a key of their choosing. On success the key
 * goes into the {@see TransientKey} holder, which the diary key store consults
 * first, so the encrypted cast and track metadata work unchanged.
 */
class VerifyDiaryKey
{
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

        if ($dek === false
            || strlen($dek) !== DiaryCrypto::DEK_BYTES
            || $this->crypto->isAllZeroKey($dek)) {
            abort(403, 'The X-Diary-Key header must carry the diary key as base64 of 32 bytes.');
        }

        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        if (! $this->crypto->verifyKeyCheck($user->key_check, $dek)) {
            abort(403, 'The diary key is not valid for this account.');
        }

        $this->keys->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));

        return $next($request);
    }
}
