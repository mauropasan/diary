import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
    destroy as adminUsersDestroy,
    store as adminUsersStore,
} from '@/routes/admin/users';

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    entries_count: number;
    created_at: string;
};

type AdminUsersSectionProps = {
    users: AdminUser[];
};

export default function AdminUsersSection({
    users,
}: AdminUsersSectionProps): React.JSX.Element {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        post(adminUsersStore.url(), { onSuccess: () => reset() });
    }

    function confirmRemoveUser(): void {
        if (!userToDelete) {
            return;
        }

        router.delete(adminUsersDestroy.url(userToDelete.id), {
            onFinish: () => setUserToDelete(null),
        });
    }

    const fieldClass =
        'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none placeholder:text-zinc-600 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-400 dark:focus:border-zinc-400';

    return (
        <>
            <form
                onSubmit={submit}
                noValidate
                className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="settings-user-name"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {t('common.name')}
                    </label>
                    <input
                        id="settings-user-name"
                        type="text"
                        required
                        autoComplete="off"
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                        className={fieldClass}
                    />
                    {errors.name && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="settings-user-email"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {t('common.email')}
                    </label>
                    <input
                        id="settings-user-email"
                        type="email"
                        required
                        autoComplete="off"
                        value={data.email}
                        onChange={(event) =>
                            setData('email', event.target.value)
                        }
                        className={fieldClass}
                    />
                    {errors.email && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {errors.email}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="settings-user-password"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {t('common.password')}
                    </label>
                    <input
                        id="settings-user-password"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(event) =>
                            setData('password', event.target.value)
                        }
                        className={fieldClass}
                    />
                    {errors.password && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {errors.password}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="settings-user-password-confirmation"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {t('common.confirmPassword')}
                    </label>
                    <input
                        id="settings-user-password-confirmation"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(event) =>
                            setData('password_confirmation', event.target.value)
                        }
                        className={fieldClass}
                    />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {processing ? t('admin.submitting') : t('admin.submit')}
                </button>
            </form>

            <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t('admin.accounts', { count: users.length })}
            </h3>

            {users.length === 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.empty')}
                </p>
            )}

            {users.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {users.map((user) => (
                        <li
                            key={user.id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                    {user.name}
                                    {user.is_admin && (
                                        <span className="ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-50 uppercase dark:bg-zinc-100 dark:text-zinc-900">
                                            {t('admin.badge')}
                                        </span>
                                    )}
                                </p>
                                <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                                    {user.email} ·{' '}
                                    {t('admin.entries', {
                                        count: user.entries_count,
                                    })}{' '}
                                    ·{' '}
                                    {t('admin.since', {
                                        date: user.created_at,
                                    })}
                                </p>
                            </div>

                            {user.id !== auth.user.id && (
                                <button
                                    type="button"
                                    onClick={() => setUserToDelete(user)}
                                    className="shrink-0 rounded-md px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                                >
                                    {t('admin.delete')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                open={userToDelete !== null}
                destructive
                title={t('admin.delete')}
                message={t('admin.confirmDelete', {
                    name: userToDelete?.name ?? '',
                })}
                confirmLabel={t('admin.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={confirmRemoveUser}
                onCancel={() => setUserToDelete(null)}
            />
        </>
    );
}
