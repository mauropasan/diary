<?php

namespace App\Http\Middleware;

use App\Crypto\DiaryKeyStore;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards diary routes: without an unlocked data encryption key in the session
 * the user is sent to the unlock screen instead of being served any entry.
 */
class EnsureDiaryUnlocked
{
    public function __construct(private readonly DiaryKeyStore $store) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->store->get() === null) {
            return redirect()->guest(route('diary.unlock'));
        }

        $this->store->refresh(now()->addMinutes((int) config('diary.lock_after_minutes')));

        return $next($request);
    }
}
