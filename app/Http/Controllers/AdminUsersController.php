<?php

namespace App\Http\Controllers;

use App\Crypto\DiaryKeyManager;
use App\Http\Requests\Auth\AdminCreateUserRequest;
use App\Http\Requests\UpdateEmailRequest;
use App\Models\User;
use App\Security\TrustedDevices;
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
     * Change the sign-in email of any account from the admin list.
     *
     * Only the address is touched: entries stay encrypted under the target
     * user's own key, which the email plays no part in.
     */
    public function updateEmail(UpdateEmailRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'email' => $request->string('email')->toString(),
        ])->save();

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.admin.email-updated', ['name' => $user->name]));
    }

    /**
     * Turn two-factor authentication off for any account from the admin list.
     *
     * A lost authenticator device must never lock the owner out of their own
     * diary, so an administrator can always restore password-only sign-in:
     * the secret, the recovery codes and every trusted browser are removed.
     */
    public function disableTwoFactor(User $user, TrustedDevices $trusted): RedirectResponse
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        $trusted->revoke($user);

        return redirect()
            ->route('diary.settings')
            ->with('status', __('messages.admin.two-factor-disabled', ['name' => $user->name]));
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
