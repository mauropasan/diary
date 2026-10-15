<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyManager;
use App\Exceptions\KeyUnwrapException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    /**
     * Re-wrap the diary key with a KEK derived from the new password and update
     * the login password hash. Entry content is never re-encrypted.
     */
    public function update(UpdatePasswordRequest $request, DiaryKeyManager $keys): RedirectResponse
    {
        $user = $request->user();
        $newPassword = $request->string('password')->toString();

        try {
            DB::transaction(function () use ($keys, $request, $user, $newPassword): void {
                $keys->rewrap($user, $request->string('current_password')->toString(), $newPassword);

                $user->forceFill(['password' => Hash::make($newPassword)])->save();
            });
        } catch (KeyUnwrapException) {
            throw ValidationException::withMessages([
                'current_password' => __('messages.password.unwrap-failed'),
            ]);
        }

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.password.updated'));
    }
}
