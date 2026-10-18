<?php

use App\Security\Totp;

/** The SHA-1 secret of the RFC test suite, base32 encoded. */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

it('matches the RFC 6238 test vectors', function (int $at, string $code) {
    $totp = new Totp;

    expect($totp->currentCode(RFC_SECRET, $at))->toBe($code)
        ->and($totp->verify($code, RFC_SECRET, $at))->toBeTrue();
})->with([
    'time 59' => [59, '287082'],
    'time 1111111109' => [1111111109, '081804'],
    'time 1111111111' => [1111111111, '050471'],
    'time 1234567890' => [1234567890, '005924'],
    'time 2000000000' => [2000000000, '279037'],
    'time 20000000000' => [20000000000, '353130'],
]);

it('accepts neighbouring codes to tolerate clock drift', function () {
    $totp = new Totp;
    $at = 1111111111;

    $previous = $totp->currentCode(RFC_SECRET, $at - Totp::PERIOD);
    $next = $totp->currentCode(RFC_SECRET, $at + Totp::PERIOD);

    expect($totp->verify($previous, RFC_SECRET, $at))->toBeTrue()
        ->and($totp->verify($next, RFC_SECRET, $at))->toBeTrue();
});

it('rejects a code two steps away from the current one', function () {
    $totp = new Totp;
    $at = 1111111111;

    $stale = $totp->currentCode(RFC_SECRET, $at - (2 * Totp::PERIOD));
    $future = $totp->currentCode(RFC_SECRET, $at + (2 * Totp::PERIOD));

    expect($totp->verify($stale, RFC_SECRET, $at))->toBeFalse()
        ->and($totp->verify($future, RFC_SECRET, $at))->toBeFalse();
});

it('rejects a malformed code', function (string $code) {
    expect((new Totp)->verify($code, RFC_SECRET))->toBeFalse();
})->with([
    'empty' => '',
    'five digits' => '12345',
    'seven digits' => '1234567',
    'letters' => 'abcdef',
    'space inside' => '12 3456',
    'too long' => '1234567890',
]);

it('rejects a code when the secret is not base32', function (string $secret) {
    expect((new Totp)->verify('287082', $secret))->toBeFalse();
})->with([
    'garbage' => 'not-a-secret!',
    'empty' => '',
]);

it('generates a thirty two character base32 secret', function () {
    $secret = (new Totp)->generateSecret();

    expect($secret)->toMatch('/^[A-Z2-7]{32}$/')
        ->and((new Totp)->generateSecret())->not->toBe($secret);
});

it('builds the otpauth url an authenticator app understands', function () {
    $url = (new Totp)->otpauthUrl('Diary', 'user@example.com', RFC_SECRET);

    expect($url)->toBe(
        'otpauth://totp/Diary:user%40example.com?secret='.RFC_SECRET
        .'&issuer=Diary&algorithm=SHA1&digits=6&period=30'
    );
});

it('renders the enrolment url as a square svg data uri', function () {
    $uri = (new Totp)->qrCodeDataUri((new Totp)->otpauthUrl('Diary', 'a@b.c', RFC_SECRET));
    $prefix = 'data:image/svg+xml;base64,';

    expect($uri)->toStartWith($prefix);

    $svg = base64_decode(substr($uri, strlen($prefix)), true);

    expect($svg)->toBeString()
        ->toStartWith('<svg')
        ->toContain('<path');

    expect($svg)->not->toContain('<?xml');

    expect(preg_match('/viewBox="0 0 (\d+) \1"/', $svg))->toBe(1);
});
