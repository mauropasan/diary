<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Resolve the request language and make it the application locale.
     *
     * The saved `lang` cookie wins over the Accept-Language header so the
     * manual language choice made in the UI stays put. When neither points at
     * a supported language, the configured default (English) is used.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('diary.locales', []);
        $cookie = $request->cookie(config('diary.cookie_name', 'lang'));
        $cookie = is_string($cookie) ? strtolower($cookie) : '';

        $locale = in_array($cookie, $supported, true)
            ? $cookie
            : ($this->preferredFromHeader($request, $supported) ?? config('diary.default_locale', 'en'));

        app()->setLocale($locale);

        return $next($request);
    }

    /**
     * Pick the first supported language from the Accept-Language header,
     * matching a base code (e.g. `pt-BR` against supported `pt`).
     *
     * @param  array<int, string>  $supported
     */
    private function preferredFromHeader(Request $request, array $supported): ?string
    {
        foreach ($request->getLanguages() as $language) {
            $base = strtolower((string) strstr($language, '-', true) ?: $language);

            if (in_array(strtolower($language), $supported, true)) {
                return strtolower($language);
            }

            if (in_array($base, $supported, true)) {
                return $base;
            }
        }

        return null;
    }
}
