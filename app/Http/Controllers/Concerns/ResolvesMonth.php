<?php

namespace App\Http\Controllers\Concerns;

use Carbon\CarbonImmutable;

trait ResolvesMonth
{
    /**
     * Resolve a `YYYY-MM` month string, falling back to the given date's month.
     */
    private function resolveMonth(mixed $mes, CarbonImmutable $fallback): CarbonImmutable
    {
        if (is_string($mes) && preg_match('/^\d{4}-\d{2}$/', $mes) === 1) {
            $month = CarbonImmutable::createFromFormat('!Y-m', $mes, config('app.timezone'));

            if ($month !== null && $month->format('Y-m') === $mes) {
                return $month->startOfMonth();
            }
        }

        return $fallback->startOfMonth();
    }
}
