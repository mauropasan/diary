<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyManager;
use App\Crypto\DiaryKeyStore;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    /**
     * Show the one-time registration screen.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Create the first user, generate their key material and unlock the diary.
     *
     * The account and its wrapped data encryption key are written in a single
     * transaction so a failure can never leave a half-created user behind
     * (which would permanently close registration).
     */
    public function store(RegisterRequest $request, DiaryKeyManager $keys, DiaryKeyStore $store): RedirectResponse
    {
        $password = $request->string('password')->toString();
        $user = new User($request->safe()->only(['name', 'email', 'password']));

        $recoveryKey = DB::transaction(function () use ($keys, $user, $password): string {
            $user->save();

            return $keys->provision($user, $password);
        });

        $dek = $keys->unlock($user, $password);

        Auth::login($user);
        $request->session()->regenerate();

        $store->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));

        return redirect()
            ->route('diary.show', now()->toDateString())
            ->with('status', 'Tu diario está listo.')
            ->with('recoveryKey', $recoveryKey);
    }
}
