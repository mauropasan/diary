<?php

use App\Crypto\DiaryKeyManager;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();
});

it('pairs a device with email and password', function () {
    $response = $this->postJson(route('api.auth.login'), [
        'email' => $this->user->email,
        'password' => 'secret-password',
    ])->assertOk();

    expect($response->json('token'))->toBeString()
        ->and($response->json('token_type'))->toBe('Bearer')
        ->and($response->json('user.email'))->toBe($this->user->email)
        ->and($response->json('user.two_factor_enabled'))->toBeFalse()
        ->and($response->json('dek'))->toBeNull()
        ->and($response->json('key.kdf_salt'))->not->toBeNull()
        ->and($response->json('key.wrapped_key'))->not->toBeNull();

    // The client derives the DEK locally by unwrapping with a KEK derived
    // from the password and the returned salt/wrapped key material.
    expect(app(DiaryKeyManager::class)->unlock($this->user, 'secret-password'))->toBeString();

    // The token carries only the sync ability and works on the API.
    $this->withToken((string) $response->json('token'))
        ->getJson(route('api.auth.me'))
        ->assertOk()
        ->assertJsonPath('user.email', $this->user->email);

    $this->assertDatabaseCount('personal_access_tokens', 1);

    $token = PersonalAccessToken::findToken((string) $response->json('token'));

    expect($token)->toBeInstanceOf(PersonalAccessToken::class)
        ->and($token->abilities)->toBe(['sync'])
        ->and($token->tokenable->is($this->user))->toBeTrue();
});

it('rejects a wrong password with no token and no key', function () {
    $response = $this->postJson(route('api.auth.login'), [
        'email' => $this->user->email,
        'password' => 'not-the-password',
    ])->assertUnprocessable();

    expect($response->json('token'))->toBeNull()
        ->and($response->json('dek'))->toBeNull();

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('rejects an unknown email like a wrong password', function () {
    $this->postJson(route('api.auth.login'), [
        'email' => 'nobody@example.com',
        'password' => 'secret-password',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('revokes only the token used to log out', function () {
    $first = $this->postJson(route('api.auth.login'), [
        'email' => $this->user->email,
        'password' => 'secret-password',
    ])->assertOk()->json('token');

    $second = $this->postJson(route('api.auth.login'), [
        'email' => $this->user->email,
        'password' => 'secret-password',
    ])->assertOk()->json('token');

    $this->withToken($first)
        ->postJson(route('api.auth.logout'))
        ->assertOk();

    // Within one test the Auth manager reuses the resolved sanctum
    // RequestGuard, which caches the user it resolved before the token
    // was revoked, so the next request would still see it as logged in.
    $this->app->make('auth')->forgetGuards();

    $this->withToken($first)
        ->getJson(route('api.auth.me'))
        ->assertUnauthorized();

    $this->withToken($second)
        ->getJson(route('api.auth.me'))
        ->assertOk();
});

it('requires a token for the account endpoints', function () {
    $this->getJson(route('api.auth.me'))->assertUnauthorized();
    $this->postJson(route('api.auth.logout'))->assertUnauthorized();
});

it('registers the first account with its key material and recovery key', function () {
    // A fresh install has no accounts, so registration is open.
    User::query()->delete();

    $response = $this->postJson(route('api.auth.register'), [
        'name' => 'First User',
        'email' => 'first@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ])->assertCreated();

    $user = User::where('email', 'first@example.com')->firstOrFail();

    expect($user->is_admin)->toBeTrue()
        ->and($user->wrapped_key)->not->toBeNull()
        ->and($user->key_check)->not->toBeNull()
        ->and($response->json('recovery_key'))->toBeString()
        ->and($response->json('token'))->toBeString()
        ->and($response->json('dek'))->toBeNull()
        ->and($response->json('key.kdf_salt'))->not->toBeNull()
        ->and($response->json('key.wrapped_key'))->not->toBeNull();

    // The password and recovery key both unwrap the same DEK.
    $dek = app(DiaryKeyManager::class)->unlock($user, 'secret-password');
    expect(app(DiaryKeyManager::class)->unlockWithRecoveryKey($user, (string) $response->json('recovery_key')))
        ->toBe($dek);

    $this->withToken((string) $response->json('token'))
        ->getJson(route('api.auth.me'))
        ->assertOk()
        ->assertJsonPath('user.email', 'first@example.com');
});

it('closes registration once an account exists', function () {
    // beforeEach created a user, so the gate is shut.
    $this->postJson(route('api.auth.register'), [
        'name' => 'Second User',
        'email' => 'second@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ])->assertNotFound();

    $this->assertDatabaseMissing('users', ['email' => 'second@example.com']);
});

it('validates the registration fields like the web form', function () {
    // A fresh install has no accounts, so registration is open.
    User::query()->delete();

    $this->postJson(route('api.auth.register'), [
        'name' => '',
        'email' => 'not-an-email',
        'password' => 'short',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'password']);
});

it('stops a two-factor account at the password and finishes with a code', function () {
    $user = User::factory()->withDiaryKey('secret-password')->withTwoFactor()->create();

    $challenge = $this->postJson(route('api.auth.login'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertOk();

    expect($challenge->json('two_factor_required'))->toBeTrue()
        ->and($challenge->json('token'))->toBeNull()
        ->and($challenge->json('dek'))->toBeNull()
        ->and($challenge->json('challenge_id'))->toBeUuid()
        ->and($challenge->json('expires_in'))->toBe(600);

    $this->assertDatabaseCount('personal_access_tokens', 0);

    $code = (new Totp)->currentCode($user->refresh()->two_factor_secret);

    $this->postJson(route('api.auth.two-factor'), [
        'challenge_id' => $challenge->json('challenge_id'),
        'code' => $code,
    ])->assertOk()
        ->assertJsonPath('user.email', $user->email)
        ->assertJsonPath('user.two_factor_enabled', true);

    $this->assertDatabaseCount('personal_access_tokens', 1);
});

it('rejects a wrong authenticator code and burns the challenge', function () {
    $user = User::factory()->withDiaryKey('secret-password')->withTwoFactor()->create();

    $challengeId = $this->postJson(route('api.auth.login'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertOk()->json('challenge_id');

    $secret = $user->refresh()->two_factor_secret;
    $totp = new Totp;

    for ($i = 0; $i < 1000; $i++) {
        $candidate = str_pad((string) $i, 6, '0', STR_PAD_LEFT);

        if (! $totp->verify($candidate, $secret)) {
            break;
        }
    }

    $this->postJson(route('api.auth.two-factor'), [
        'challenge_id' => $challengeId,
        'code' => $candidate,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    $this->assertDatabaseCount('personal_access_tokens', 0);

    // The challenge was consumed by the failed attempt, so even the right
    // code no longer completes it.
    $this->postJson(route('api.auth.two-factor'), [
        'challenge_id' => $challengeId,
        'code' => (new Totp)->currentCode($secret),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('challenge_id');
});

it('finishes a two-factor sign-in with a recovery code', function () {
    $recovery = new RecoveryCodes;
    $codes = $recovery->generate();

    $user = User::factory()->withDiaryKey('secret-password')->create();

    $user->forceFill([
        'two_factor_secret' => (new Totp)->generateSecret(),
        'two_factor_confirmed_at' => now(),
        'two_factor_recovery_codes' => $recovery->hash($codes),
    ])->save();

    $challengeId = $this->postJson(route('api.auth.login'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertOk()->json('challenge_id');

    $this->postJson(route('api.auth.recover'), [
        'challenge_id' => $challengeId,
        'recovery_code' => $codes[0],
    ])->assertOk()
        ->assertJsonPath('user.email', $user->email);

    // The code was consumed, so it cannot pair a second device.
    $challengeId = $this->postJson(route('api.auth.login'), [
        'email' => $user->email,
        'password' => 'secret-password',
    ])->assertOk()->json('challenge_id');

    $this->postJson(route('api.auth.recover'), [
        'challenge_id' => $challengeId,
        'recovery_code' => $codes[0],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('recovery_code');
});

it('rejects a two-factor challenge with no parked attempt', function () {
    $this->postJson(route('api.auth.two-factor'), [
        'challenge_id' => (string) Str::uuid(),
        'code' => '123456',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('challenge_id');
});

it('does not park a two-factor attempt with the wrong password', function () {
    $user = User::factory()->withDiaryKey('secret-password')->withTwoFactor()->create();

    $this->postJson(route('api.auth.login'), [
        'email' => $user->email,
        'password' => 'not-the-password',
    ])->assertUnprocessable();
});
