import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminUsersSection, {
    type AdminUser,
} from '@/components/AdminUsersSection';
import DiaryNav from '@/components/DiaryNav';
import RecoveryKeyBanner from '@/components/RecoveryKeyBanner';
import StatusFlyout from '@/components/StatusFlyout';

type AdminUsersProps = {
    users: AdminUser[];
};

/**
 * Administration page: account management lives here on its own, away from
 * the personal settings, so non-admin users never see admin tools mixed into
 * their own preferences.
 */
export default function AdminUsers({ users }: AdminUsersProps) {
    const { t } = useTranslation();
    const { flash } = usePage().props;
    const [recoveryKeyDismissed, setRecoveryKeyDismissed] = useState(false);

    return (
        <>
            <Head title={t('admin.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('admin.heading')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                {t('admin.subtitle')}
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

                    <AdminUsersSection users={users} />
                </div>
            </div>
        </>
    );
}
