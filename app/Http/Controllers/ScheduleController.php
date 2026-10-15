<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $schedules = $request->user()
            ->schedules()
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return Inertia::render('diary/schedule', [
            'schedules' => $schedules->map(fn (Schedule $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slots' => $s->slots,
                'only_weekdays' => $s->only_weekdays,
                'active' => $s->active,
                'position' => $s->position,
            ])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slots' => ['nullable', 'string'],
            'only_weekdays' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
        ]);

        $schedules = $request->user()->schedules();

        $request->user()->schedules()->create([
            'name' => $validated['name'],
            'slots' => $validated['slots'] ?? null,
            'only_weekdays' => $validated['only_weekdays'] ?? false,
            'active' => $validated['active'] ?? true,
            'position' => ($schedules->exists() ? (int) $schedules->max('position') + 1 : 0),
        ]);

        return redirect()->route('diary.schedule');
    }

    public function update(Request $request, Schedule $schedule): RedirectResponse
    {
        if ($request->user()->id !== $schedule->user_id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slots' => ['nullable', 'string'],
            'only_weekdays' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
        ]);

        $schedule->update([
            'name' => $validated['name'],
            'slots' => $validated['slots'] ?? null,
            'only_weekdays' => $validated['only_weekdays'] ?? false,
            'active' => $validated['active'] ?? true,
        ]);

        return redirect()->route('diary.schedule');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $user = $request->user();

        $owned = $user->schedules()->pluck('id')->all();

        if (array_diff($validated['ids'], $owned) !== []) {
            abort(404);
        }

        DB::transaction(function () use ($user, $validated): void {
            foreach ($validated['ids'] as $index => $id) {
                $user->schedules()
                    ->whereKey($id)
                    ->update(['position' => $index]);
            }
        });

        return redirect()->route('diary.schedule');
    }

    public function destroy(Request $request, Schedule $schedule): RedirectResponse
    {
        if ($request->user()->id !== $schedule->user_id) {
            abort(404);
        }
        $schedule->delete();

        return redirect()->route('diary.schedule');
    }
}
