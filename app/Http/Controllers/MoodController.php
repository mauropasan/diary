<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesMonth;
use App\Models\Entry;
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
        ]);
    }
}
