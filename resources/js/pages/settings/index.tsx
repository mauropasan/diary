import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminUsersSection, {
    type AdminUser,
} from '@/components/AdminUsersSection';
import BackgroundPicker from '@/components/BackgroundPicker';
import DiaryNav from '@/components/DiaryNav';
import FlashBanner from '@/components/FlashBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import RecoveryKeyBanner from '@/components/RecoveryKeyBanner';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Link } from '@inertiajs/react';
import { exportMethod as diaryExport } from '@/routes/diary';
import { update as passwordUpdate } from '@/routes/diary/password';
import { update as settingsUpdate } from '@/routes/diary/settings';

type SettingsProps = {
    background: string | null;
    backgrounds: string[];
    emailNotifications: boolean;
    users: AdminUser[] | null;
};

const fieldClass =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none placeholder:text-zinc-600 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-400 dark:focus:border-zinc-400';

export default function Settings({
    background,
    backgrounds,
    emailNotifications,
    users,
}: SettingsProps) {
    const { t } = useTranslation();
    const { flash } = usePage().props;
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);
    const [flashDismissed, setFlashDismissed] = useState(false);

    const password = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const notifications = useForm({
        email_notifications: emailNotifications,
    });

    function submitPassword(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        password.put(passwordUpdate.url(), {
            onSuccess: () => password.reset(),
        });
    }

    function submitNotifications(
        event: React.FormEvent<HTMLFormElement>,
    ): void {
        event.preventDefault();
        notifications.put(settingsUpdate.url(), {
            onSuccess: () => {
                notifications.setData(
                    'email_notifications',
                    notifications.data.email_notifications,
                );
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

                    {flash.status && !flashDismissed && (
                        <FlashBanner
                            message={flash.status}
                            onClose={() => setFlashDismissed(true)}
                        />
                    )}

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

                            <form
                                onSubmit={submitNotifications}
                                noValidate
                                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <input
                                    id="email_notifications"
                                    type="checkbox"
                                    checked={
                                        notifications.data.email_notifications
                                    }
                                    onChange={(event) =>
                                        notifications.setData(
                                            'email_notifications',
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
