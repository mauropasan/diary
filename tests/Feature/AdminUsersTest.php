<?php

use App\Crypto\DiaryKeyManager;
use App\Models\Entry;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

it('redirects guests away from the admin panel', function () {
    $this->get(route('admin.users.index'))->assertRedirect(route('login'));
});

it('blocks non-admin users from the admin panel', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

it('redirects the old admin users page to settings', function () {
    $admin = User::factory()->asAdmin()->withDiaryKey('secret')->create();

    $this->actingAs($admin)
        ->post(route('diary.unlock.store'), ['password' => 'secret'])
        ->assertRedirect(route('diary.show', now()->toDateString()));

    $this->get(route('admin.users.index'))->assertRedirect(route('diary.settings'));
});

it('shows the list of users in the settings page for an admin', function () {
    $admin = User::factory()->asAdmin()->withDiaryKey('secret')->create();
    User::factory()->count(2)->create();

    $this->actingAs($admin)
        ->post(route('diary.unlock.store'), ['password' => 'secret']);

    $this->get(route('diary.settings'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('settings/index')
            ->has('users', 3)
        );
});

it('lets an admin create a user without giving up their own session', function () {
    $admin = User::factory()->asAdmin()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'super-secret-1',
            'password_confirmation' => 'super-secret-1',
        ])
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('recoveryKey');

    $bob = User::query()->where('email', 'bob@example.com')->firstOrFail();

    expect($bob->is_admin)->toBeFalse()
        ->and($bob->kdf_salt)->not->toBeNull()
        ->and($bob->wrapped_key)->not->toBeNull()
        ->and($bob->recovery_wrapped_key)->not->toBeNull();

    $this->assertAuthenticatedAs($admin);

    $manager = app(DiaryKeyManager::class);

    expect($manager->unlockWithRecoveryKey($bob, session('recoveryKey')))
        ->toBe($manager->unlock($bob, 'super-secret-1'));
});

it('blocks non-admin users from creating accounts', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.users.store'), [
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'super-secret-1',
            'password_confirmation' => 'super-secret-1',
        ])
        ->assertForbidden();

    expect(User::query()->where('email', 'bob@example.com')->exists())->toBeFalse();
});

it('rejects an admin-created user with a duplicate email', function () {
    $admin = User::factory()->asAdmin()->create();
    $existing = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Bob',
            'email' => $existing->email,
            'password' => 'super-secret-1',
            'password_confirmation' => 'super-secret-1',
        ])
        ->assertSessionHasErrors('email');
});

it('rejects an admin-created user with a mismatched password confirmation', function () {
    $admin = User::factory()->asAdmin()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'super-secret-1',
            'password_confirmation' => 'different-secret-1',
        ])
        ->assertSessionHasErrors('password');

    expect(User::query()->where('email', 'bob@example.com')->exists())->toBeFalse();
});

it('lets an admin remove a user and all of their encrypted data', function () {
    $admin = User::factory()->asAdmin()->create();
    $victim = User::factory()->withDiaryKey('secret')->create();

    DB::table('entries')->insert([
        [
            'user_id' => $admin->id,
            'date' => now()->toDateString(),
            'title' => 'admin-raw',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $victim->id,
            'date' => now()->subDay()->toDateString(),
            'title' => 'victim-raw',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $victimEntry = Entry::query()
        ->where('user_id', $victim->id)
        ->firstOrFail();

    DB::table('tags')->insert([
        'user_id' => $victim->id,
        'name' => 'Violeta',
        'name_index' => 'violeta',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $victimTag = Tag::query()->where('user_id', $victim->id)->firstOrFail();

    DB::table('entry_tag')->insert([
        'entry_id' => $victimEntry->id,
        'tag_id' => $victimTag->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $victim))
        ->assertRedirect(route('diary.settings'))
        ->assertSessionHas('status');

    expect(User::query()->whereKey($victim->id)->exists())->toBeFalse()
        ->and(Entry::query()->where('user_id', $victim->id)->count())->toBe(0)
        ->and(Tag::query()->where('user_id', $victim->id)->count())->toBe(0)
        ->and(Entry::query()->where('user_id', $admin->id)->count())->toBe(1);
});

it('prevents an admin from deleting their own account', function () {
    $admin = User::factory()->asAdmin()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertRedirect(route('diary.settings'));

    expect(User::query()->whereKey($admin->id)->exists())->toBeTrue();
});

it('blocks non-admin users from removing accounts', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)
        ->delete(route('admin.users.destroy', $other))
        ->assertForbidden();

    expect(User::query()->whereKey($other->id)->exists())->toBeTrue();
});

it('throttles repeated admin user creation attempts', function () {
    $admin = User::factory()->asAdmin()->create();

    $this->actingAs($admin);

    foreach (range(1, 10) as $attempt) {
        $this->post(route('admin.users.store'), []);
    }

    $this->post(route('admin.users.store'), [])->assertStatus(429);
});
