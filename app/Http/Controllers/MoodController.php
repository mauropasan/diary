<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesMonth;
use App\Models\Entry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MoodController extends Controller
{
    use ResolvesMonth;

    /**
     * Show the mood tracker for the requested month.
     *
     * The mood is stored in plaintext, so no entry is ever decrypted here.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $month = $this->resolveMonth($request->query('mes'), CarbonImmutable::today());

        $moods = $user->entries()
            ->whereBetween('date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
            ->whereNotNull('mood')
            ->orderBy('date')
            ->get(['date', 'mood'])
            ->map(fn (Entry $entry): array => [
                'date' => $entry->date->toDateString(),
                'mood' => (int) $entry->mood,
            ])
            ->all();

        return Inertia::render('diary/mood', [
            'month' => $month->format('Y-m'),
            'moods' => $moods,
            'canGoNext' => $month->lessThan(CarbonImmutable::today()->startOfMonth()),
            'days' => $user->entries()
                ->whereNotNull('mood')
                ->where('date', '<=', CarbonImmutable::today()->toDateString())
                ->count(),
            'streak' => $this->streak($user),
        ]);
    }

    /**
     * Consecutive days with a mood, counting back from today across months.
     *
     * A mood for today extends the run but is not required yet: the day has
     * not been missed until it ends. Any earlier gap resets the streak.
     */
    private function streak(User $user): int
    {
        $today = CarbonImmutable::today();

        $dates = $user->entries()
            ->whereNotNull('mood')
            ->where('date', '<=', $today->toDateString())
            ->orderByDesc('date')
            ->get(['date'])
            ->map(fn (Entry $entry): string => $entry->date->toDateString())
            ->all();

        $streak = 0;
        $index = 0;

        if (($dates[0] ?? null) === $today->toDateString()) {
            $streak = 1;
            $index = 1;
        }

        for ($day = $today->subDay(); $index < count($dates); $day = $day->subDay()) {
            if ($dates[$index] !== $day->toDateString()) {
                break;
            }

            $streak++;
            $index++;
        }

        return $streak;
    }
}
