<?php

namespace App\Http\Controllers;

use App\Crypto\DiaryKeyManager;
use App\Http\Requests\Auth\AdminCreateUserRequest;
use App\Http\Requests\DisableTwoFactorRequest;
use App\Http\Requests\UpdateEmailRequest;
use App\Models\User;
use App\Security\TrustedDevices;
use App\Security\TwoFactorNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class AdminUsersController extends Controller
{
    /**
     * Show the administration page: every diary account in plaintext,
     * plus the tools to create, edit and remove them.
     *
     * Nothing here needs the diary key, so the page also works while the
     * diary itself is locked; only plaintext account data is shown, entry
     * content is never decrypted on this path.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('admin/users', [
            'users' => $this->users(),
        ]);
    }

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
            ->route('admin.users.index')
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
            ->route('admin.users.index')
            ->with('status', __('messages.admin.email-updated', ['name' => $user->name]));
    }

    /**
     * Turn two-factor authentication off for any account from the admin list.
     *
     * A lost authenticator device must never lock the owner out of their own
     * diary, so an administrator can always restore password-only sign-in:
     * the secret, the recovery codes and every trusted browser are removed.
     * The administrator confirms their own password first, the account is
     * signed out everywhere and its owner is warned by notification and email.
     */
    public function disableTwoFactor(DisableTwoFactorRequest $request, User $user, TrustedDevices $trusted, TwoFactorNotifier $notifier): RedirectResponse
    {
        $actor = $request->user();

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        $trusted->revoke($user);

        // An administrator turning the feature off for their own account is
        // doing it from the settings page in all but name: signing themselves
        // out mid-request would only be surprising.
        if (! $user->is($actor)) {
            $this->endSessions($user);
        }

        $notifier->disabled($user, $actor);

        return redirect()
            ->route('admin.users.index')
            ->with('status', __('messages.admin.two-factor-disabled', ['name' => $user->name]));
    }

    /**
     * Sign an account out of every browser.
     *
     * The "remember me" token is rotated and the stored sessions are dropped,
     * so a device that was signed in (or trusted for two-factor) keeps no way
     * back in once an administrator has turned the second factor off.
     */
    private function endSessions(User $user): void
    {
        $user->forceFill(['remember_token' => Str::random(60)])->save();

        DB::table((string) config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->delete();
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
                ->route('admin.users.index')
                ->with('status', __('messages.admin.self-delete'));
        }

        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('status', __('messages.admin.deleted', ['name' => $user->name]));
    }

    /**
     * List every diary account for the administration page.
     *
     * Only plaintext information is shown; entry content is never decrypted here.
     *
     * @return array<int, array{id: int, name: string, email: string, is_admin: bool, two_factor_enabled: bool, entries_count: int, created_at: string}>
     */
    private function users(): array
    {
        return User::query()
            ->withCount('entries')
            ->orderBy('created_at')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'two_factor_enabled' => $user->twoFactorEnabled(),
                'entries_count' => (int) $user->entries_count,
                'created_at' => $user->created_at->toDateString(),
            ])
            ->all();
    }
}
