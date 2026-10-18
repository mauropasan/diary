<?php

use App\Crypto\DiaryKeyManager;
use App\Models\TwoFactorDevice;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use App\Security\TrustedDevices;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()
        ->withDiaryKey('secret-password')
        ->withTwoFactor()
        ->create();

    $this->park = function (): void {
        $this->post(route('login.store'), [
            'email' => $this->user->email,
            'password' => 'secret-password',
        ])->assertRedirect(route('two-factor'));
    };

    /** A six digit code the current window will never accept. */
    $this->wrongCode = function (): string {
        $secret = $this->user->refresh()->two_factor_secret;
        $totp = new Totp;

        for ($i = 0; $i < 1000; $i++) {
            $candidate = str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            if (! $totp->verify($candidate, $secret)) {
                return $candidate;
            }
        }

        $this->fail('No code outside the valid window could be found.');
    };

    $this->currentCode = function (): string {
        return (new Totp)->currentCode($this->user->refresh()->two_factor_secret);
    };
});

it('parks the password and asks for the second factor', function () {
    ($this->park)();

    $this->assertGuest();

    expect(session('two_factor.pending'))
        ->toHaveKey('user_id', $this->user->id)
        ->toHaveKey('password', 'secret-password')
        ->toHaveKey('expires_at');

    $this->get(route('two-factor'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/two-factor')
            ->where('trustDays', TrustedDevices::TTL_DAYS)
        );
});

it('does not park an attempt with the wrong password', function () {
    $this->from(route('login'))->post(route('login.store'), [
        'email' => $this->user->email,
        'password' => 'wrong-password',
    ])->assertRedirect(route('login'))->assertSessionHasErrors('email');

    $this->assertGuest();

    expect(session()->has('two_factor.pending'))->toBeFalse();
});

it('finishes the sign in with a valid authenticator code', function () {
    ($this->park)();

    $this->post(route('two-factor.store'), ['code' => ($this->currentCode)()])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($this->user);

    expect(session()->has('two_factor.pending'))->toBeFalse()
        ->and(TwoFactorDevice::query()->where('user_id', $this->user->id)->exists())->toBeFalse();

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('rejects a wrong code and keeps the attempt pending', function () {
    ($this->park)();

    $this->from(route('two-factor'))
        ->post(route('two-factor.store'), ['code' => ($this->wrongCode)()])
        ->assertRedirect(route('two-factor'))
        ->assertSessionHasErrors('code');

    $this->assertGuest();

    expect(session()->has('two_factor.pending'))->toBeTrue();

    $this->get(route('two-factor'))->assertOk();
});

it('accepts a recovery code exactly once', function () {
    $recovery = new RecoveryCodes;
    $codes = $recovery->generate();

    $this->user->forceFill(['two_factor_recovery_codes' => $recovery->hash($codes)])->save();

    ($this->park)();

    $this->post(route('two-factor.store'), ['code' => $codes[0]])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($this->user);

    expect($this->user->refresh()->two_factor_recovery_codes)
        ->toHaveCount(RecoveryCodes::COUNT - 1);

    $this->post(route('logout'));

    ($this->park)();

    $this->post(route('two-factor.store'), [
        'code' => strtolower(str_replace('-', '', $codes[0])),
    ])->assertSessionHasErrors('code');

    $this->assertGuest();
});

it('remembers the browser when the trust checkbox is on', function () {
    ($this->park)();

    $this->post(route('two-factor.store'), [
        'code' => ($this->currentCode)(),
        'trust' => '1',
    ])->assertRedirect(route('diary.show', now()->toDateString()));

    $device = TwoFactorDevice::query()
        ->where('user_id', $this->user->id)
        ->first();

    expect($device)->not->toBeNull()
        ->and($device->token_hash)->toMatch('/^[a-f0-9]{64}$/')
        ->and($device->expires_at->greaterThan(now()->addDays(TrustedDevices::TTL_DAYS - 1)))->toBeTrue();
});

it('skips the challenge for a trusted browser', function () {
    $token = Str::random(40);

    TwoFactorDevice::query()->create([
        'user_id' => $this->user->id,
        'token_hash' => hash('sha256', $token),
        'expires_at' => now()->addDays(TrustedDevices::TTL_DAYS),
    ]);

    $this->withCookie(TrustedDevices::COOKIE, $token)
        ->post(route('login.store'), [
            'email' => $this->user->email,
            'password' => 'secret-password',
        ])->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($this->user);

    expect(session()->has('two_factor.pending'))->toBeFalse();

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('asks again when the trusted device has expired', function () {
    TwoFactorDevice::query()->create([
        'user_id' => $this->user->id,
        'token_hash' => hash('sha256', 'expired-token'),
        'expires_at' => now()->subDay(),
    ]);

    $this->withCookie(TrustedDevices::COOKIE, 'expired-token')
        ->post(route('login.store'), [
            'email' => $this->user->email,
            'password' => 'secret-password',
        ])->assertRedirect(route('two-factor'));

    $this->assertGuest();

    expect(session()->has('two_factor.pending'))->toBeTrue();
});

it('expires a parked attempt after five minutes', function () {
    ($this->park)();

    $this->travel(6)->minutes();

    $this->get(route('two-factor'))->assertRedirect(route('login'));

    expect(session()->has('two_factor.pending'))->toBeFalse();

    $this->post(route('two-factor.store'), ['code' => ($this->currentCode)()])
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

it('requires a code to finish the sign in', function () {
    ($this->park)();

    $this->post(route('two-factor.store'), [])
        ->assertSessionHasErrors('code');

    $this->assertGuest();
});

it('throttles repeated challenge attempts', function () {
    ($this->park)();

    $wrong = ($this->wrongCode)();

    foreach (range(1, 6) as $attempt) {
        $this->post(route('two-factor.store'), ['code' => $wrong]);
    }

    $this->post(route('two-factor.store'), ['code' => $wrong])
        ->assertStatus(429);
});

it('redirects visitors with no pending attempt', function () {
    $this->get(route('two-factor'))->assertRedirect(route('login'));
});

it('keeps unlocking after inactivity password only', function () {
    ($this->park)();
    $this->post(route('two-factor.store'), ['code' => ($this->currentCode)()])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->post(route('diary.lock'));

    $this->post(route('diary.unlock.store'), ['password' => 'secret-password'])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($this->user);

    expect(session()->has('two_factor.pending'))->toBeFalse();

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});

it('lets the one time recovery key bypass the second factor', function () {
    $user = User::factory()->create(['password' => Hash::make('old-password')]);
    $recoveryKey = app(DiaryKeyManager::class)->provision($user, 'old-password');

    $recovery = new RecoveryCodes;

    $user->forceFill([
        'two_factor_secret' => (new Totp)->generateSecret(),
        'two_factor_confirmed_at' => now(),
        'two_factor_recovery_codes' => $recovery->hash($recovery->generate()),
    ])->save();

    $this->post(route('diary.recovery.store'), [
        'email' => $user->email,
        'recovery_key' => $recoveryKey,
        'password' => 'recovered-password',
        'password_confirmation' => 'recovered-password',
    ])->assertRedirect(route('diary.show', now()->toDateString()));

    $this->assertAuthenticatedAs($user->fresh());

    $this->get(route('diary.show', now()->toDateString()))->assertOk();
});
