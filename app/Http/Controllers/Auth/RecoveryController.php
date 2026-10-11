<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyManager;
use App\Crypto\DiaryKeyStore;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RecoveryRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RecoveryController extends Controller
{
    /**
     * Show the recovery screen.
     */
    public function create(): Response
    {
        return Inertia::render('auth/recovery');
    }

    /**
     * Restore access using the one-time recovery key and set a new password.
     *
     * The recovery key unwraps the existing DEK, so entry content is never
     * re-encrypted; only the wrapped copy of the DEK and the login hash change.
     */
    public function store(RecoveryRequest $request, DiaryKeyManager $keys, DiaryKeyStore $store): RedirectResponse
    {
        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        if ($user === null || $user->recovery_wrapped_key === null) {
            throw ValidationException::withMessages([
                'email' => 'No hay ninguna cuenta con clave de recuperación para ese correo.',
            ]);
        }

        try {
            $dek = $keys->unlockWithRecoveryKey($user, trim($request->string('recovery_key')->toString()));
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'recovery_key' => 'La clave de recuperación no es válida o los datos están dañados.',
            ]);
        }

        $newPassword = $request->string('password')->toString();

        DB::transaction(function () use ($keys, $user, $dek, $newPassword): void {
            $keys->rewrapWithDek($user, $dek, $newPassword);

            $user->forceFill(['password' => Hash::make($newPassword)])->save();
        });

        Auth::login($user);
        $request->session()->regenerate();

        $store->put($dek, now()->addMinutes((int) config('diary.lock_after_minutes')));

        return redirect()
            ->route('diary.show', now()->toDateString())
            ->with('status', 'Acceso restaurado y contraseña actualizada.');
    }
}
