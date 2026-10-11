<?php

use App\Crypto\DiaryKeyManager;
use App\Exceptions\KeyUnwrapException;
use App\Models\User;

it('re-wraps the key on password change', function () {
    $user = User::factory()->withDiaryKey('old-password')->create();
    $manager = app(DiaryKeyManager::class);

    $dek = $manager->unlock($user, 'old-password');

    $manager->rewrap($user, 'old-password', 'new-password');
    $user->refresh();

    expect($manager->unlock($user, 'new-password'))->toBe($dek);
});

it('rejects the old password after a password change', function () {
    $user = User::factory()->withDiaryKey('old-password')->create();
    $manager = app(DiaryKeyManager::class);

    $manager->rewrap($user, 'old-password', 'new-password');

    expect(fn () => $manager->unlock($user->refresh(), 'old-password'))
        ->toThrow(KeyUnwrapException::class);
});
