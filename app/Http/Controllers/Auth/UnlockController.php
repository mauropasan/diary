<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryUnlocker;
use App\Exceptions\InvalidPasswordException;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UnlockRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UnlockController extends Controller
{
    /**
     * Show the unlock screen.
     */
    public function create(): Response
    {
        return Inertia::render('auth/unlock');
    }

    /**
     * Verify the password and unlock the diary for the current session.
     */
    public function store(UnlockRequest $request, DiaryUnlocker $unlocker): RedirectResponse
    {
        try {
            $unlocker->unlock($request->user(), $request->string('password')->toString());
        } catch (InvalidPasswordException) {
            throw ValidationException::withMessages([
                'password' => 'La contraseña no es correcta.',
            ]);
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'password' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
            ]);
        }

        return redirect()->intended(route('diary.show', now()->toDateString()));
    }
}
