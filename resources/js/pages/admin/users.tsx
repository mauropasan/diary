import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import DiaryNav from '@/components/DiaryNav';
import {
    destroy as adminUsersDestroy,
    store as adminUsersStore,
} from '@/routes/admin/users';

type AdminUser = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    entries_count: number;
    created_at: string;
};

type AdminUsersProps = {
    users: AdminUser[];
};

export default function AdminUsers({ users }: AdminUsersProps) {
    const { t } = useTranslation();
    const { auth, flash } = usePage().props;
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);
    const [flashDismissed, setFlashDismissed] = useState(false);
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

    return (
        <>
            <Head title={t('admin.title')} />

            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="w-full px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('admin.heading')}
                            </h1>
                        </div>

                        <DiaryNav />
                    </header>

                    {flash.recoveryKey && !recoveryKeyDismissed && (
                        <div className="mb-6 w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                            <div className="mb-2 flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        {t('admin.recoveryTitle')}
                                    </p>
                                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                        {t('admin.recoveryIntro')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRecoveryKeyDismissed(true)
                                    }
                                    aria-label={t('common.close')}
                                    className="shrink-0 leading-none text-amber-600 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                                >
                                    ×
                                </button>
                            </div>
                            <code className="block rounded bg-amber-100 px-3 py-2 font-mono text-xs break-all dark:bg-amber-900/50">
                                {flash.recoveryKey}
                            </code>
                        </div>
                    )}

                    {flash.status && !flashDismissed && (
                        <div className="mb-6 flex w-full items-start justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                            <span>{flash.status}</span>
                            <button
                                type="button"
                                onClick={() => setFlashDismissed(true)}
                                aria-label={t('common.close')}
                                className="shrink-0 leading-none text-emerald-600 transition hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <section className="max-w-3xl m-auto mb-10">
                        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t('admin.createTitle')}
                        </h2>

                        <form
                            onSubmit={submit}
                            noValidate
                            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="name"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.name')}
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        required
                                        autoComplete="off"
                                        value={data.name}
                                        onChange={(event) =>
                                            setData('name', event.target.value)
                                        }
                                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.email')}
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="off"
                                        value={data.email}
                                        onChange={(event) =>
                                            setData('email', event.target.value)
                                        }
                                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.password')}
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={data.password}
                                        onChange={(event) =>
                                            setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="password_confirmation"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.confirmPassword')}
                                    </label>
                                    <input
                                        id="password_confirmation"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={data.password_confirmation}
                                        onChange={(event) =>
                                            setData(
                                                'password_confirmation',
                                                event.target.value,
                                            )
                                        }
                                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                >
                                    {processing
                                        ? t('admin.submitting')
                                        : t('admin.submit')}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="max-w-3xl m-auto">
                        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {t('admin.accounts', { count: users.length })}
                        </h2>

                        {users.length === 0 && (
                            <p className="text-sm text-zinc-400 dark:text-zinc-500">
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
                                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
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
                                                onClick={() =>
                                                    setUserToDelete(user)
                                                }
                                                className="shrink-0 rounded-md px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                                            >
                                                {t('admin.delete')}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

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
