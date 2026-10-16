<?php

use App\Models\Schedule;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

/**
 * Insert a legacy plaintext schedule row, bypassing the model casts.
 *
 * @param  array<string, mixed>  $overrides
 */
function insertPlaintextSchedule(User $user, array $overrides = []): int
{
    return (int) DB::table('schedules')->insertGetId(array_merge([
        'user_id' => $user->id,
        'name' => 'Escuela',
        'slots' => '[["08:00","Math","","","","","",""]]',
        'only_weekdays' => true,
        'active' => true,
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));
}

it('encrypts legacy plaintext schedules and keeps reading them back', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();
    $scheduleId = insertPlaintextSchedule($user);

    $this->artisan('diary:encrypt-schedules')
        ->expectsQuestion('Password for '.$user->email, 'secret-password')
        ->assertSuccessful();

    $row = DB::table('schedules')->where('id', $scheduleId)->first();

    expect($row->name)->not->toBe('Escuela')
        ->and($row->slots)->not->toBe('[["08:00","Math","","","","","",""]]');

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $schedule = Schedule::findOrFail($scheduleId);

    expect($schedule->name)->toBe('Escuela')
        ->and($schedule->slots)->toBe('[["08:00","Math","","","","","",""]]')
        ->and($schedule->only_weekdays)->toBeTrue();
});

it('is idempotent when schedules are already encrypted', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();
    $scheduleId = insertPlaintextSchedule($user);

    $this->artisan('diary:encrypt-schedules')
        ->expectsQuestion('Password for '.$user->email, 'secret-password')
        ->assertSuccessful();

    $encrypted = DB::table('schedules')->where('id', $scheduleId)->first();

    $this->artisan('diary:encrypt-schedules')
        ->expectsQuestion('Password for '.$user->email, 'secret-password')
        ->assertSuccessful();

    $afterSecondRun = DB::table('schedules')->where('id', $scheduleId)->first();

    expect($afterSecondRun->name)->toBe($encrypted->name)
        ->and($afterSecondRun->slots)->toBe($encrypted->slots);
});

it('leaves schedules untouched when the password is wrong', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();
    $scheduleId = insertPlaintextSchedule($user);

    $this->artisan('diary:encrypt-schedules')
        ->expectsQuestion('Password for '.$user->email, 'wrong-password')
        ->expectsQuestion('Password for '.$user->email, 'wrong-password')
        ->expectsQuestion('Password for '.$user->email, 'wrong-password')
        ->assertFailed();

    $row = DB::table('schedules')->where('id', $scheduleId)->first();

    expect($row->name)->toBe('Escuela')
        ->and($row->slots)->toBe('[["08:00","Math","","","","","",""]]');
});

it('only converts schedules of the requested users', function () {
    $alice = User::factory()->withDiaryKey('alice-password')->create(['email' => 'alice@example.com']);
    $bob = User::factory()->withDiaryKey('bob-password')->create(['email' => 'bob@example.com']);

    $aliceSchedule = insertPlaintextSchedule($alice, ['name' => 'Alice plan']);
    $bobSchedule = insertPlaintextSchedule($bob, ['name' => 'Bob plan']);

    $this->artisan('diary:encrypt-schedules', ['--user' => ['alice@example.com']])
        ->expectsQuestion('Password for alice@example.com', 'alice-password')
        ->assertSuccessful();

    expect(DB::table('schedules')->where('id', $aliceSchedule)->first()->name)
        ->not->toBe('Alice plan')
        ->and(DB::table('schedules')->where('id', $bobSchedule)->first()->name)
        ->toBe('Bob plan');
});

it('keeps null slots null through conversion', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();
    $scheduleId = insertPlaintextSchedule($user, ['slots' => null]);

    $this->artisan('diary:encrypt-schedules')
        ->expectsQuestion('Password for '.$user->email, 'secret-password')
        ->assertSuccessful();

    $row = DB::table('schedules')->where('id', $scheduleId)->first();

    expect($row->slots)->toBeNull()
        ->and(Schedule::findOrFail($scheduleId)->slots)->toBeNull();
});

it('stores new schedules encrypted through the http api', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $this->post(route('diary.schedule.store'), [
        'name' => 'Gimnasio',
        'slots' => '[["07:00","Hiit","","","","","",""]]',
    ])->assertRedirect(route('diary.schedule'));

    $schedule = Schedule::firstOrFail();
    $row = DB::table('schedules')->where('id', $schedule->id)->first();

    expect($row->name)->not->toBe('Gimnasio')
        ->and($row->slots)->not->toBe('[["07:00","Hiit","","","","","",""]]')
        ->and($schedule->name)->toBe('Gimnasio')
        ->and($schedule->slots)->toBe('[["07:00","Hiit","","","","","",""]]');

    $this->get(route('diary.schedule'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/schedule')
            ->where('schedules.0.name', 'Gimnasio')
        );
});

it('redirects a locked session away from the schedule page', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($user)
        ->get(route('diary.schedule'))
        ->assertRedirect(route('diary.unlock'));
});
