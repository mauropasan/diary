<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the one-time registration flow.
 *
 * Registration exists only to bootstrap the very first account, so once any
 * user is registered the endpoints disappear (404) and the normal login flow
 * takes over.
 */
class EnsureNoUsersRegistered
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (User::query()->exists()) {
            abort(404);
        }

        return $next($request);
    }
}
