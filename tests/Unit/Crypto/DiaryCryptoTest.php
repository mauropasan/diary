<?php

use App\Crypto\DiaryCrypto;
use App\Exceptions\DecryptionFailedException;
use App\Exceptions\KeyUnwrapException;

it('decrypts a message back to its original plaintext', function () {
    $crypto = new DiaryCrypto;
    $dek = $crypto->generateDek();
    $plaintext = 'Querido diario, hoy ha sido un buen día.';

    $ciphertext = $crypto->encrypt($plaintext, $dek);

    expect($crypto->decrypt($ciphertext, $dek))->toBe($plaintext);
});

it('produces different ciphertexts for the same plaintext', function () {
    $crypto = new DiaryCrypto;
    $dek = $crypto->generateDek();

    $first = $crypto->encrypt('same plaintext', $dek);
    $second = $crypto->encrypt('same plaintext', $dek);

    expect($first)->not->toBe($second);
});

it('wraps and unwraps the data encryption key with the correct password', function () {
    $crypto = new DiaryCrypto;
    $salt = $crypto->generateSalt();
    $dek = $crypto->generateDek();
    $kek = $crypto->deriveKek('correct horse battery staple', $salt);

    $wrapped = $crypto->wrapDek($dek, $kek);

    expect($crypto->unwrapDek($wrapped, $kek))->toBe($dek);
});

it('fails to unwrap the data encryption key with the wrong password', function () {
    $crypto = new DiaryCrypto;
    $salt = $crypto->generateSalt();
    $dek = $crypto->generateDek();
    $wrapped = $crypto->wrapDek($dek, $crypto->deriveKek('correct horse battery staple', $salt));
    $wrongKek = $crypto->deriveKek('incorrect horse battery staple', $salt);

    expect(fn () => $crypto->unwrapDek($wrapped, $wrongKek))
        ->toThrow(KeyUnwrapException::class);
});

it('rejects a tampered ciphertext', function () {
    $crypto = new DiaryCrypto;
    $dek = $crypto->generateDek();
    $ciphertext = $crypto->encrypt('secret', $dek);

    $bytes = base64_decode($ciphertext, true);
    $lastIndex = strlen($bytes) - 1;
    $bytes[$lastIndex] = chr(ord($bytes[$lastIndex]) ^ 0x01);

    expect(fn () => $crypto->decrypt(base64_encode($bytes), $dek))
        ->toThrow(DecryptionFailedException::class);
});

it('rejects a malformed ciphertext', function () {
    $crypto = new DiaryCrypto;
    $dek = $crypto->generateDek();

    expect(fn () => $crypto->decrypt('not-a-valid-payload', $dek))
        ->toThrow(DecryptionFailedException::class);
});
