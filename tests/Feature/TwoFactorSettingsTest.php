<?php

use App\Mail\TwoFactorStatusChanged;
use App\Models\TwoFactorDevice;
use App\Models\User;
use App\Security\RecoveryCodes;
use App\Security\Totp;
use App\Security\TwoFactorNotifier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Mail::fake();

    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->unlock = function (): void {
        $this->actingAs($this->user)
            ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
    };

    $this->enable = function (): void {
        $this->post(route('diary.settings.two-factor.enable'));
    };

    $this->confirm = function (string $secret) {
        return $this->post(route('diary.settings.two-factor.confirm'), [
            'code' => (new Totp)->currentCode($secret),
        ]);
    };

    /** A six digit code the current window will never accept. */
    $this->wrongCode = function (string $secret): string {
        $totp = new Totp;

        for ($i = 0; $i < 1000; $i++) {
            $candidate = str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            if (! $totp->verify($candidate, $secret)) {
                return $candidate;
            }
        }

        $this->fail('No code outside the valid window could be found.');
    };
});

it('shares the two factor state on the settings page', function () {
    ($this->unlock)();

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->where('twoFactor.enabled', false)
            ->where('twoFactor.pending', false)
            ->where('twoFactor.secret', null)
            ->where('twoFactor.qr', null)
            ->where('twoFactor.recoveryCodesRemaining', 0)
        );
});

it('starts enrolment with a qr code and a setup key kept out of the database', function () {
    ($this->unlock)();
    ($this->enable)();

    $this->post(route('diary.settings.two-factor.enable'))
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.two_factor.ready'));

    $this->user->refresh();
    $secret = $this->user->two_factor_secret;
    $totp = new Totp;

    expect($secret)->toMatch('/^[A-Z2-7]{32}$/')
        ->and($this->user->twoFactorEnabled())->toBeFalse()
        ->and(DB::table('users')->where('id', $this->user->id)->value('two_factor_secret'))
        ->not->toContain($secret);

    $expectedQr = $totp->qrCodeDataUri(
        $totp->otpauthUrl((string) config('app.name'), $this->user->email, $secret),
    );

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->where('twoFactor.enabled', false)
            ->where('twoFactor.pending', true)
            ->where('twoFactor.secret', $secret)
            ->where('twoFactor.qr', $expectedQr)
        );
});

it('keeps the same setup key when enrolment is restarted', function () {
    ($this->unlock)();
    ($this->enable)();

    $secret = $this->user->refresh()->two_factor_secret;

    ($this->enable)();

    expect($this->user->refresh()->two_factor_secret)->toBe($secret);
});

it('requires a code to confirm the enrolment', function () {
    ($this->unlock)();
    ($this->enable)();

    $this->post(route('diary.settings.two-factor.confirm'), [])
        ->assertSessionHasErrors('code');

    expect($this->user->refresh()->two_factor_confirmed_at)->toBeNull();
});

it('rejects a code the authenticator app would not produce', function () {
    ($this->unlock)();
    ($this->enable)();

    $secret = $this->user->refresh()->two_factor_secret;

    $this->post(route('diary.settings.two-factor.confirm'), [
        'code' => ($this->wrongCode)($secret),
    ])->assertSessionHasErrors('code');

    expect($this->user->refresh()->twoFactorEnabled())->toBeFalse();
});

it('confirms the enrolment and flashes the recovery codes once', function () {
    ($this->unlock)();
    ($this->enable)();

    $secret = $this->user->refresh()->two_factor_secret;

    $response = ($this->confirm)($secret);
    $response->assertSessionHas('status', __('messages.two_factor.enabled'));

    $codes = session('recoveryCodes');

    $this->user->refresh();

    expect($this->user->twoFactorEnabled())->toBeTrue()
        ->and($this->user->two_factor_confirmed_at)->not->toBeNull()
        ->and($this->user->two_factor_recovery_codes)->toHaveCount(RecoveryCodes::COUNT)
        ->and($codes)->toHaveCount(RecoveryCodes::COUNT)
        ->and($codes[0])->toMatch('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/')
        ->and(DB::table('users')->where('id', $this->user->id)->value('two_factor_recovery_codes'))
        ->not->toContain($codes[0]);

    $this->get(route('diary.settings'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->where('twoFactor.enabled', true)
            ->where('twoFactor.pending', false)
            ->where('twoFactor.secret', null)
            ->where('twoFactor.qr', null)
            ->where('twoFactor.recoveryCodesRemaining', RecoveryCodes::COUNT)
        );
});

it('leaves a confirmed account alone when the confirmation is repeated', function () {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    session()->forget('recoveryCodes');

    ($this->confirm)($this->user->refresh()->two_factor_secret)
        ->assertSessionHas('status', __('messages.two_factor.ready'))
        ->assertSessionMissing('recoveryCodes');

    expect($this->user->refresh()->two_factor_recovery_codes)
        ->toHaveCount(RecoveryCodes::COUNT);
});

it('regenerates the recovery codes so the previous set stops working', function () {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    $first = session('recoveryCodes');

    $this->post(route('diary.settings.two-factor.recovery-codes'))
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.two_factor.codes-regenerated'));

    $second = session('recoveryCodes');

    expect($second)->toHaveCount(RecoveryCodes::COUNT)
        ->and($second)->not->toBe($first);

    $recovery = new RecoveryCodes;

    expect($recovery->consume($this->user->refresh(), $first[0]))->toBeFalse()
        ->and($recovery->consume($this->user->refresh(), $second[0]))->toBeTrue();
});

it('does not issue recovery codes without two factor authentication', function () {
    ($this->unlock)();

    $this->post(route('diary.settings.two-factor.recovery-codes'))
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.two_factor.disabled'))
        ->assertSessionMissing('recoveryCodes');
});

it('turns two factor authentication off and forgets every trusted browser', function () {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    TwoFactorDevice::query()->create([
        'user_id' => $this->user->id,
        'token_hash' => hash('sha256', 'known-token'),
        'expires_at' => now()->addDays(30),
    ]);

    $this->delete(route('diary.settings.two-factor.disable'), [
        'current_password' => 'secret-password',
    ])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.two_factor.disabled'));

    $this->user->refresh();

    expect($this->user->two_factor_secret)->toBeNull()
        ->and($this->user->two_factor_confirmed_at)->toBeNull()
        ->and($this->user->two_factor_recovery_codes)->toBeNull()
        ->and(TwoFactorDevice::query()->where('user_id', $this->user->id)->exists())->toBeFalse();
});

it('refuses to turn two factor authentication off without the account password', function (array $payload) {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    TwoFactorDevice::query()->create([
        'user_id' => $this->user->id,
        'token_hash' => hash('sha256', 'known-token'),
        'expires_at' => now()->addDays(30),
    ]);

    $this->delete(route('diary.settings.two-factor.disable'), $payload)
        ->assertSessionHasErrors('current_password');

    $this->user->refresh();

    expect($this->user->twoFactorEnabled())->toBeTrue()
        ->and($this->user->two_factor_secret)->not->toBeNull()
        ->and($this->user->two_factor_recovery_codes)->toHaveCount(RecoveryCodes::COUNT)
        ->and(TwoFactorDevice::query()->where('user_id', $this->user->id)->exists())->toBeTrue();

    Mail::assertNotSent(
        TwoFactorStatusChanged::class,
        fn (TwoFactorStatusChanged $mail) => $mail->kind === TwoFactorNotifier::DISABLED,
    );
})->with([
    'no password' => [[]],
    'wrong password' => [['current_password' => 'not-the-password']],
]);

it('cancels a pending enrolment without asking for the password', function () {
    ($this->unlock)();
    ($this->enable)();

    $this->delete(route('diary.settings.two-factor.disable'))
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status', __('messages.two_factor.disabled'));

    expect($this->user->refresh()->two_factor_secret)->toBeNull();

    Mail::assertNothingSent();
});

it('warns the owner by notification and email when two factor is turned on and off', function () {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    $notifications = $this->user->notifications()->get();

    expect($notifications)->toHaveCount(1)
        ->and($notifications->first()->kind)->toBe(TwoFactorNotifier::ENABLED);

    Mail::assertSent(
        TwoFactorStatusChanged::class,
        fn (TwoFactorStatusChanged $mail) => $mail->kind === TwoFactorNotifier::ENABLED
            && $mail->hasTo($this->user->email)
            && $mail->actorName === null,
    );

    $this->delete(route('diary.settings.two-factor.disable'), [
        'current_password' => 'secret-password',
    ]);

    $notifications = $this->user->notifications()->get();

    expect($notifications)->toHaveCount(2)
        ->and($notifications->last()->kind)->toBe(TwoFactorNotifier::DISABLED);

    Mail::assertSent(
        TwoFactorStatusChanged::class,
        fn (TwoFactorStatusChanged $mail) => $mail->kind === TwoFactorNotifier::DISABLED,
    );

    Mail::assertSentCount(2);
});

it('stores application notifications encrypted and readable without diary text', function () {
    ($this->unlock)();
    ($this->enable)();
    ($this->confirm)($this->user->refresh()->two_factor_secret);

    $notification = $this->user->notifications()->firstOrFail();

    expect($notification->title)->toBeNull()
        ->and($notification->isSystem())->toBeTrue()
        ->and($notification->displayTitle())
        ->toBe(__('messages.notifications.kinds.two_factor_enabled.title'))
        ->and($notification->displayBody())
        ->toBe(__('messages.notifications.kinds.two_factor_enabled.body'))
        ->and(DB::table('notifications')->where('id', $notification->id)->value('kind'))
        ->not->toContain(TwoFactorNotifier::ENABLED);
});

it('renders the warning email for every kind of change', function (string $kind, ?string $actor, string $expected) {
    app()->setLocale('en');

    $mail = new TwoFactorStatusChanged($this->user, $kind, $actor);

    expect($mail->render())->toContain($expected);
})->with([
    'enabled' => [TwoFactorNotifier::ENABLED, null, 'Two-factor authentication is on'],
    'disabled' => [TwoFactorNotifier::DISABLED, null, 'Two-factor authentication is off'],
    'disabled by an administrator' => [TwoFactorNotifier::DISABLED_BY_ADMIN, 'Ada Lovelace', 'Ada Lovelace'],
]);

it('blocks a locked diary from managing two factor authentication', function (string $method, string $route) {
    ($this->unlock)();
    $this->post(route('diary.lock'));

    $this->{$method}(route($route))->assertRedirect(route('diary.unlock'));
})->with([
    'enable' => ['post', 'diary.settings.two-factor.enable'],
    'confirm' => ['post', 'diary.settings.two-factor.confirm'],
    'recovery codes' => ['post', 'diary.settings.two-factor.recovery-codes'],
    'disable' => ['delete', 'diary.settings.two-factor.disable'],
]);

it('redirects guests away from the two factor settings', function (string $method, string $route) {
    $this->{$method}(route($route))->assertRedirect(route('login'));
})->with([
    'enable' => ['post', 'diary.settings.two-factor.enable'],
    'confirm' => ['post', 'diary.settings.two-factor.confirm'],
    'recovery codes' => ['post', 'diary.settings.two-factor.recovery-codes'],
    'disable' => ['delete', 'diary.settings.two-factor.disable'],
]);

it('lets an administrator turn off two factor authentication for another account', function () {
    $this->user->forceFill(['is_admin' => true])->save();
    ($this->unlock)();

    $victim = User::factory()->withTwoFactor()->create();

    TwoFactorDevice::query()->create([
        'user_id' => $victim->id,
        'token_hash' => hash('sha256', 'known-token'),
        'expires_at' => now()->addDays(30),
    ]);

    $this->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/users')
            ->has('users', 2)
            ->where('users', fn (Collection $users) => $users->firstWhere('id', $victim->id)['two_factor_enabled'] === true)
        );

    $this->delete(route('admin.users.two-factor', $victim), [
        'current_password' => 'secret-password',
    ])
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHas('status', __('messages.admin.two-factor-disabled', ['name' => $victim->name]));

    $victim->refresh();

    expect($victim->twoFactorEnabled())->toBeFalse()
        ->and($victim->two_factor_secret)->toBeNull()
        ->and($victim->two_factor_recovery_codes)->toBeNull()
        ->and(TwoFactorDevice::query()->where('user_id', $victim->id)->exists())->toBeFalse();

    $notifications = $victim->notifications()->get();

    expect($notifications)->toHaveCount(1)
        ->and($notifications->first()->kind)->toBe(TwoFactorNotifier::DISABLED_BY_ADMIN)
        ->and($notifications->first()->displayBody())
        ->toContain($this->user->name);

    Mail::assertSent(
        TwoFactorStatusChanged::class,
        fn (TwoFactorStatusChanged $mail) => $mail->kind === TwoFactorNotifier::DISABLED_BY_ADMIN
            && $mail->hasTo($victim->email)
            && $mail->actorName === $this->user->name,
    );
});

it('requires the administrator password to turn off another account two factor authentication', function () {
    $this->user->forceFill(['is_admin' => true])->save();
    ($this->unlock)();

    $victim = User::factory()->withTwoFactor()->create();

    $this->delete(route('admin.users.two-factor', $victim), [
        'current_password' => 'not-the-password',
    ])->assertSessionHasErrors('current_password');

    expect($victim->refresh()->twoFactorEnabled())->toBeTrue();

    Mail::assertNothingSent();
});

it('signs the account out everywhere when an administrator turns two factor off', function () {
    $this->user->forceFill(['is_admin' => true])->save();
    ($this->unlock)();

    $victim = User::factory()->withTwoFactor()->create([
        'remember_token' => 'known-remember-token',
    ]);

    DB::table('sessions')->insert([
        'id' => 'victim-session',
        'user_id' => $victim->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => 'payload',
        'last_activity' => now()->timestamp,
    ]);

    $this->delete(route('admin.users.two-factor', $victim), [
        'current_password' => 'secret-password',
    ])->assertRedirect(route('admin.users.index'));

    $victim->refresh();

    expect(DB::table('sessions')->where('user_id', $victim->id)->exists())->toBeFalse()
        ->and($victim->remember_token)->not->toBe('known-remember-token');
});

it('blocks a regular account from turning off another account two factor authentication', function () {
    ($this->unlock)();

    $victim = User::factory()->withTwoFactor()->create();

    $this->delete(route('admin.users.two-factor', $victim))->assertForbidden();

    expect($victim->refresh()->twoFactorEnabled())->toBeTrue();
});
