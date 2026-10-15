<?php

namespace App\Http\Controllers;

use App\Crypto\DiaryKeyManager;
use App\Http\Requests\Auth\AdminCreateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminUsersController extends Controller
{
    /**
     * Create a diary account with a password chosen by the admin.
     *
     * The admin stays logged in; the new account is never unlocked here. The
     * one-time recovery key is flashed so the admin can hand it to the user.
     * The account and its key material are written in a single transaction.
     */
    public function store(AdminCreateUserRequest $request, DiaryKeyManager $keys): RedirectResponse
    {
        $password = $request->string('password')->toString();
        $user = new User([
            ...$request->safe()->only(['name', 'email']),
            'password' => $password,
            'is_admin' => false,
        ]);

        $recoveryKey = DB::transaction(function () use ($keys, $user, $password): string {
            $user->save();

            return $keys->provision($user, $password);
        });

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.admin.created', ['name' => $user->name]))
            ->with('recoveryKey', $recoveryKey);
    }

    /**
     * Remove a diary account and all of its encrypted entries.
     *
     * The current account cannot delete itself so an administrator always
     * remains in control of the diary.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return redirect()
                ->route('diary.settings')
                ->with('status', __('messages.admin.self-delete'));
        }

        $user->delete();

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.admin.deleted', ['name' => $user->name]));
    }
}
