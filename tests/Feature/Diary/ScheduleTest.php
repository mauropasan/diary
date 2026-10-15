<?php

use App\Models\Schedule;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('stores a schedule with the weekdays-only flag and the first position', function () {
    $this->post(route('diary.schedule.store'), [
        'name' => 'School',
        'slots' => '[["08:00","Math","","","","","",""]]',
        'only_weekdays' => true,
        'active' => true,
    ])->assertRedirect(route('diary.schedule'));

    $schedule = Schedule::firstOrFail();

    expect($schedule->only_weekdays)->toBeTrue()
        ->and($schedule->position)->toBe(0);
});

it('appends new schedules at the end of the order', function () {
    Schedule::factory()->for($this->user)->create(['position' => 0]);
    Schedule::factory()->for($this->user)->create(['position' => 3]);

    $this->post(route('diary.schedule.store'), [
        'name' => 'Gym',
        'active' => false,
    ])->assertRedirect(route('diary.schedule'));

    expect(Schedule::orderByDesc('position')->firstOrFail()->position)->toBe(4);
});

it('updates the weekdays-only flag without changing the position', function () {
    $schedule = Schedule::factory()->for($this->user)->create([
        'position' => 2,
        'only_weekdays' => false,
    ]);

    $this->put(route('diary.schedule.update', $schedule), [
        'name' => $schedule->name,
        'slots' => $schedule->slots,
        'only_weekdays' => true,
        'active' => true,
    ])->assertRedirect(route('diary.schedule'));

    $schedule->refresh();

    expect($schedule->only_weekdays)->toBeTrue()
        ->and($schedule->position)->toBe(2);
});

it('reorders schedules with the given ids', function () {
    $first = Schedule::factory()->for($this->user)->create(['position' => 0]);
    $second = Schedule::factory()->for($this->user)->create(['position' => 1]);
    $third = Schedule::factory()->for($this->user)->create(['position' => 2]);

    $this->patch(route('diary.schedule.reorder'), [
        'ids' => [$third->id, $first->id, $second->id],
    ])->assertRedirect(route('diary.schedule'));

    expect($third->fresh()->position)->toBe(0)
        ->and($first->fresh()->position)->toBe(1)
        ->and($second->fresh()->position)->toBe(2);

    $this->get(route('diary.schedule'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/schedule')
            ->where('schedules.0.id', $third->id)
            ->where('schedules.1.id', $first->id)
            ->where('schedules.2.id', $second->id)
        );
});

it('rejects reordering schedules that belong to another user', function () {
    $mine = Schedule::factory()->for($this->user)->create(['position' => 0]);
    $foreign = Schedule::factory()->create(['position' => 0]);

    $this->patch(route('diary.schedule.reorder'), [
        'ids' => [$mine->id, $foreign->id],
    ])->assertNotFound();

    expect($mine->fresh()->position)->toBe(0)
        ->and($foreign->fresh()->position)->toBe(0);
});

it('shows every active schedule on the entry page in position order', function () {
    $later = Schedule::factory()->for($this->user)->create([
        'name' => 'Gym',
        'active' => true,
        'position' => 1,
    ]);
    $first = Schedule::factory()->for($this->user)->create([
        'name' => 'School',
        'active' => true,
        'position' => 0,
        'only_weekdays' => true,
    ]);
    Schedule::factory()->for($this->user)->create([
        'name' => 'Inactive',
        'active' => false,
        'position' => 2,
    ]);

    $this->get(route('diary.show', now()->toDateString()))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/show')
            ->count('schedules', 2)
            ->where('schedules.0.id', $first->id)
            ->where('schedules.0.only_weekdays', true)
            ->where('schedules.1.id', $later->id)
            ->where('schedules.1.only_weekdays', false)
        );
});
