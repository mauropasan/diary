<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyStore;
use App\Crypto\DiaryUnlocker;
use App\Exceptions\InvalidPasswordException;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Security\TrustedDevices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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
     *
     * A two-factor account stops at the password: the attempt is parked in the
     * session (which is encrypted at rest) and nothing is authenticated until
     * the second factor is confirmed on the challenge screen. The diary key is
     * only unwrapped after that, so a failed challenge leaves no key material
     * anywhere.
     */
    public function store(LoginRequest $request, DiaryUnlocker $unlocker, TrustedDevices $trusted): RedirectResponse
    {
        $user = User::query()->where('email', $request->string('email')->toString())->first();
        $password = $request->string('password')->toString();

        if ($user !== null
            && $user->twoFactorEnabled()
            && ! $trusted->trusted($request, $user)
            && Hash::check($password, $user->password)) {
            $request->session()->put('two_factor.pending', [
                'user_id' => $user->id,
                'password' => $password,
                'remember' => $request->boolean('remember'),
                'expires_at' => now()->addMinutes(TwoFactorChallengeController::PENDING_TTL_MINUTES)->getTimestamp(),
            ]);

            $request->session()->regenerate();

            return redirect()->route('two-factor');
        }

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
