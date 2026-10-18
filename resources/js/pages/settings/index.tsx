import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminUsersSection, {
    type AdminUser,
} from '@/components/AdminUsersSection';
import BackgroundPicker from '@/components/BackgroundPicker';
import DiaryNav from '@/components/DiaryNav';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';
import RecoveryCodesBanner from '@/components/RecoveryCodesBanner';
import RecoveryKeyBanner from '@/components/RecoveryKeyBanner';
import StatusFlyout from '@/components/StatusFlyout';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Link } from '@inertiajs/react';
import { exportMethod as diaryExport } from '@/routes/diary';
import { update as passwordUpdate } from '@/routes/diary/password';
import {
    confirm as twoFactorConfirm,
    disable as twoFactorDisable,
    enable as twoFactorEnable,
    recoveryCodes as twoFactorRecoveryCodes,
} from '@/routes/diary/settings/two-factor';
import {
    email as settingsEmailUpdate,
    update as settingsUpdate,
} from '@/routes/diary/settings';

export type TwoFactorState = {
    enabled: boolean;
    pending: boolean;
    secret: string | null;
    qr: string | null;
    recoveryCodesRemaining: number;
};

type SettingsProps = {
    background: string | null;
    backgrounds: string[];
    emailNotifications: boolean;
    twoFactor: TwoFactorState;
    users: AdminUser[] | null;
};

const fieldClass =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none placeholder:text-zinc-600 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-400 dark:focus:border-zinc-400';

export default function Settings({
    background,
    backgrounds,
    emailNotifications,
    twoFactor,
    users,
}: SettingsProps) {
    const { t } = useTranslation();
    const { auth, flash } = usePage().props;
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);
    const [codesDismissed, setCodesDismissed] = useState(false);
    const [disableTwoFactorOpen, setDisableTwoFactorOpen] = useState(false);

    const account = useForm({
        email: auth.user.email,
    });

    const password = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const notifications = useForm({
        email_notifications: emailNotifications,
    });

    const twoFactorCode = useForm({
        code: '',
    });

    const twoFactorPassword = useForm({
        current_password: '',
    });

    function submitAccount(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        account.patch(settingsEmailUpdate.url(), {
            preserveScroll: true,
        });
    }

    function submitPassword(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        password.put(passwordUpdate.url(), {
            preserveScroll: true,
            onSuccess: () => password.reset(),
        });
    }

    function toggleEmailNotifications(enabled: boolean): void {
        const previous = notifications.data.email_notifications;

        notifications.setData('email_notifications', enabled);
        notifications.put(settingsUpdate.url(), {
            preserveScroll: true,
            onError: () => {
                notifications.setData('email_notifications', previous);
            },
        });
    }

    function enableTwoFactor(): void {
        router.post(
            twoFactorEnable.url(),
            {},
            {
                preserveScroll: true,
            },
        );
    }

    function submitTwoFactorConfirm(
        event: React.FormEvent<HTMLFormElement>,
    ): void {
        event.preventDefault();
        twoFactorCode.post(twoFactorConfirm.url(), {
            preserveScroll: true,
            onSuccess: () => twoFactorCode.reset(),
        });
    }

    function cancelTwoFactor(): void {
        twoFactorCode.reset();
        router.delete(twoFactorDisable.url(), {
            preserveScroll: true,
        });
    }

    function regenerateRecoveryCodes(): void {
        router.post(
            twoFactorRecoveryCodes.url(),
            {},
            {
                preserveScroll: true,
            },
        );
    }

    function openDisableTwoFactor(): void {
        twoFactorPassword.reset();
        twoFactorPassword.clearErrors();
        setDisableTwoFactorOpen(true);
    }

    function cancelDisableTwoFactor(): void {
        twoFactorPassword.reset();
        twoFactorPassword.clearErrors();
        setDisableTwoFactorOpen(false);
    }

    function confirmDisableTwoFactor(): void {
        twoFactorPassword.delete(twoFactorDisable.url(), {
            preserveScroll: true,
            onSuccess: () => {
                twoFactorPassword.reset();
                setDisableTwoFactorOpen(false);
            },
        });
    }

    return (
        <>
            <Head title={t('settings.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('settings.title')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                {t('settings.subtitle')}
                            </p>
                        </div>

                        <DiaryNav />
                    </header>

                    {flash.recoveryKey && !recoveryKeyDismissed && (
                        <RecoveryKeyBanner
                            className="w-full"
                            title={t('admin.recoveryTitle')}
                            intro={t('admin.recoveryIntro')}
                            code={flash.recoveryKey}
                            onClose={() => setRecoveryKeyDismissed(true)}
                        />
                    )}

                    <StatusFlyout message={flash.status} />

                    <div className="flex flex-col gap-8">
                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.appearance')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.appearanceSubtitle')}
                            </p>

                            <div className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {t('theme.label')}
                                    </p>
                                    <ThemeSwitcher layout="list" />
                                </div>

                                <div>
                                    <label
                                        htmlFor="settings-language"
                                        className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.language')}
                                    </label>
                                    <LanguageSwitcher className={fieldClass} />
                                </div>

                                <div>
                                    <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {t('settings.background')}
                                    </p>
                                    <BackgroundPicker
                                        background={background}
                                        backgrounds={backgrounds}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.export')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.exportSubtitle')}
                            </p>

                            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <Link
                                    href={diaryExport.url()}
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                                >
                                    {t('nav.export')}
                                </Link>
                            </div>
                        </section>

                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.notifications')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.notificationsSubtitle')}
                            </p>

                            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <input
                                    id="email_notifications"
                                    type="checkbox"
                                    checked={
                                        notifications.data.email_notifications
                                    }
                                    onChange={(event) =>
                                        toggleEmailNotifications(
                                            event.target.checked,
                                        )
                                    }
                                    className="rounded-zinc-700 border-zinc-700 text-zinc-900 focus:ring-zinc-700 dark:ring-zinc-700"
                                />
                                <label
                                    htmlFor="email_notifications"
                                    className="cursor-pointer text-sm font-medium text-zinc-700 select-none dark:text-zinc-300"
                                >
                                    {t('settings.emailNotifications')}
                                </label>
                                <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-500">
                                    {notifications.data.email_notifications
                                        ? t('settings.emailNotificationsOn')
                                        : t('settings.emailNotificationsOff')}
                                </span>
                            </div>
                            {notifications.errors.email_notifications && (
                                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                    {notifications.errors.email_notifications}
                                </p>
                            )}
                        </section>

                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.account')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.accountSubtitle')}
                            </p>

                            <form
                                onSubmit={submitAccount}
                                noValidate
                                className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="settings-account-email"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.email')}
                                    </label>
                                    <input
                                        id="settings-account-email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={account.data.email}
                                        onChange={(event) =>
                                            account.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                    {account.errors.email && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {account.errors.email}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={account.processing}
                                    className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                >
                                    {account.processing
                                        ? t('settings.emailSubmitting')
                                        : t('settings.emailSubmit')}
                                </button>
                            </form>
                        </section>

                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.password')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.passwordSubtitle')}
                            </p>

                            <form
                                onSubmit={submitPassword}
                                noValidate
                                className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="current_password"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('password.current')}
                                    </label>
                                    <input
                                        id="current_password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        value={password.data.current_password}
                                        onChange={(event) =>
                                            password.setData(
                                                'current_password',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                    {password.errors.current_password && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {password.errors.current_password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.newPassword')}
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={password.data.password}
                                        onChange={(event) =>
                                            password.setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                    {password.errors.password && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {password.errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="password_confirmation"
                                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        {t('common.confirmNewPassword')}
                                    </label>
                                    <input
                                        id="password_confirmation"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={
                                            password.data.password_confirmation
                                        }
                                        onChange={(event) =>
                                            password.setData(
                                                'password_confirmation',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={password.processing}
                                    className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                >
                                    {password.processing
                                        ? t('password.submitting')
                                        : t('password.submit')}
                                </button>
                            </form>
                        </section>

                        <section className="w-full">
                            <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {t('settings.twoFactor')}
                            </h2>
                            <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                {t('settings.twoFactorSubtitle')}
                            </p>

                            {flash.recoveryCodes && !codesDismissed && (
                                <RecoveryCodesBanner
                                    codes={flash.recoveryCodes}
                                    onClose={() => setCodesDismissed(true)}
                                />
                            )}

                            <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                {!twoFactor.enabled && !twoFactor.pending && (
                                    <>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {t('settings.twoFactorEnableHint')}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={enableTwoFactor}
                                            className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                        >
                                            {t('settings.twoFactorEnable')}
                                        </button>
                                    </>
                                )}

                                {twoFactor.pending && (
                                    <>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {t('settings.twoFactorQrHint')}
                                        </p>

                                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                            {twoFactor.qr !== null && (
                                                <img
                                                    src={twoFactor.qr}
                                                    alt={t(
                                                        'settings.twoFactorQrAlt',
                                                    )}
                                                    className="h-40 w-40 rounded-md bg-white p-2"
                                                />
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                    {t(
                                                        'settings.twoFactorSecret',
                                                    )}
                                                </p>
                                                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs break-all dark:bg-zinc-800">
                                                    {twoFactor.secret}
                                                </code>
                                            </div>
                                        </div>

                                        <form
                                            onSubmit={submitTwoFactorConfirm}
                                            noValidate
                                            className="flex flex-col gap-3"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <label
                                                    htmlFor="settings-two-factor-code"
                                                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                                >
                                                    {t(
                                                        'settings.twoFactorCode',
                                                    )}
                                                </label>
                                                <input
                                                    id="settings-two-factor-code"
                                                    type="text"
                                                    required
                                                    autoFocus
                                                    autoComplete="one-time-code"
                                                    inputMode="numeric"
                                                    value={
                                                        twoFactorCode.data.code
                                                    }
                                                    onChange={(event) =>
                                                        twoFactorCode.setData(
                                                            'code',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={fieldClass}
                                                />
                                                {twoFactorCode.errors.code && (
                                                    <p className="text-xs text-red-600 dark:text-red-400">
                                                        {
                                                            twoFactorCode.errors
                                                                .code
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        twoFactorCode.processing
                                                    }
                                                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                                >
                                                    {twoFactorCode.processing
                                                        ? t(
                                                              'settings.twoFactorConfirming',
                                                          )
                                                        : t(
                                                              'settings.twoFactorConfirm',
                                                          )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelTwoFactor}
                                                    className="rounded-md px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}

                                {twoFactor.enabled && (
                                    <>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {t('settings.twoFactorOnHint')}
                                        </p>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                            {t(
                                                'settings.twoFactorCodesRemaining',
                                                {
                                                    count: twoFactor.recoveryCodesRemaining,
                                                },
                                            )}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={
                                                    regenerateRecoveryCodes
                                                }
                                                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                                            >
                                                {t(
                                                    'settings.twoFactorRegenerate',
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={openDisableTwoFactor}
                                                className="rounded-md px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                            >
                                                {t('settings.twoFactorDisable')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <PasswordConfirmDialog
                                open={disableTwoFactorOpen}
                                title={t('settings.twoFactorDisable')}
                                message={t('settings.twoFactorDisableConfirm')}
                                passwordLabel={t('common.password')}
                                password={
                                    twoFactorPassword.data.current_password
                                }
                                onPasswordChange={(value) =>
                                    twoFactorPassword.setData(
                                        'current_password',
                                        value,
                                    )
                                }
                                error={
                                    twoFactorPassword.errors.current_password
                                }
                                processing={twoFactorPassword.processing}
                                confirmLabel={t('settings.twoFactorDisable')}
                                cancelLabel={t('common.cancel')}
                                onConfirm={confirmDisableTwoFactor}
                                onCancel={cancelDisableTwoFactor}
                            />
                        </section>

                        {users !== null && (
                            <section className="w-full">
                                <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                    {t('settings.users')}
                                </h2>
                                <p className="mb-4 text-xs text-zinc-700 dark:text-zinc-300">
                                    {t('settings.usersSubtitle')}
                                </p>

                                <AdminUsersSection users={users} />
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
