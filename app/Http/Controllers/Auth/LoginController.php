<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyStore;
use App\Crypto\DiaryUnlocker;
use App\Exceptions\InvalidPasswordException;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    /**
     * Show the login screen, or send a fresh install to registration.
     */
    public function create(): Response|RedirectResponse
    {
        if (User::query()->doesntExist()) {
            return redirect()->route('register');
        }

        return Inertia::render('auth/login');
    }

    /**
     * Authenticate the user and unlock the diary.
     */
    public function store(LoginRequest $request, DiaryUnlocker $unlocker): RedirectResponse
    {
        if (! Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('messages.login.failed'),
            ]);
        }

        $request->session()->regenerate();

        try {
            $unlocker->unlock($request->user(), $request->string('password')->toString());
        } catch (InvalidPasswordException|KeyUnwrapException) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'password' => __('messages.login.unwrap-failed'),
            ]);
        }

        return redirect()->intended(route('diary.show', now()->toDateString()));
    }

    /**
     * Lock the diary and log the user out.
     */
    public function destroy(Request $request, DiaryKeyStore $store): RedirectResponse
    {
        $store->forget();

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
