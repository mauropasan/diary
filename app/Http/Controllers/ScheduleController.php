<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $schedules = $request->user()
            ->schedules()
            ->orderByDesc('active')
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('diary/schedule', [
            'schedules' => $schedules->map(fn (Schedule $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slots' => $s->slots,
                'active' => $s->active,
            ])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slots' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
        ]);

        $request->user()->schedules()->create([
            'name' => $validated['name'],
            'slots' => $validated['slots'] ?? null,
            'active' => $validated['active'] ?? true,
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
            'active' => ['nullable', 'boolean'],
        ]);

        $schedule->update([
            'name' => $validated['name'],
            'slots' => $validated['slots'] ?? null,
            'active' => $validated['active'] ?? true,
        ]);

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
