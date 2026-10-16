import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/components/ConfirmDialog';
import DiaryNav from '@/components/DiaryNav';
import FlashBanner from '@/components/FlashBanner';
import { cn } from '@/lib/utils';
import {
    destroy as notificationDestroy,
    read as notificationMarkRead,
} from '@/routes/diary/notifications';

type Notification = {
    id: number;
    title: string | null;
    body: string | null;
    readAt: string | null;
    createdAt: string;
};

type NotificationsPageProps = {
    notifications: Notification[];
};

export default function Notifications({
    notifications,
}: NotificationsPageProps): React.JSX.Element {
    const { t } = useTranslation();
    const [notificationToDelete, setNotificationToDelete] = useState<number | null>(
        null,
    );
    const [flashDismissed, setFlashDismissed] = useState(false);

    function markRead(id: number): void {
        router.patch(notificationMarkRead.url(id), {
            preserveScroll: true,
        });
    }

    function confirmRemove(id: number): void {
        setNotificationToDelete(id);
    }

    function remove(): void {
        if (notificationToDelete === null) {
            return;
        }
        router.delete(notificationDestroy.url(notificationToDelete), {
            preserveScroll: true,
            onFinish: () => setNotificationToDelete(null),
        });
    }

    const unreadCount = notifications.filter(
        (notification) => notification.readAt === null,
    ).length;

    const flash = usePage().props.flash as
        | { status: string | null }
        | undefined;

    return (
        <>
            <Head title={t('notifications.title')} />

            <div className="min-h-screen text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <header className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {t('common.brand')}
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {t('notifications.title')}
                            </h1>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                {t('notifications.subtitle')}
                            </p>
                        </div>

                        <DiaryNav />
                    </header>

                    {flash?.status && !flashDismissed && (
                        <FlashBanner
                            message={flash.status}
                            onClose={() => setFlashDismissed(true)}
                        />
                    )}

                    <div className="m-auto max-w-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                {t('notifications.list')}
                                {unreadCount > 0 ? (
                                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-zinc-50">
                                        {unreadCount}
                                    </span>
                                ) : null}
                            </h2>
                        </div>

                        {notifications.length === 0 && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {t('notifications.empty')}
                            </p>
                        )}

                        {notifications.length > 0 && (
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {notifications.map((notification) => {
                                    const isRead = notification.readAt !== null;

                                    return (
                                        <li
                                            key={notification.id}
                                            className={cn(
                                                'flex flex-col gap-2 rounded-lg border p-4',
                                                isRead
                                                    ? 'bg-zinc-50 dark:bg-zinc-900/50'
                                                    : 'bg-zinc-100 dark:bg-zinc-800',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className={cn(
                                                    'rounded-full px-2 py-0.5 text-xs font-medium',
                                                    isRead
                                                        ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
                                                )}
                                                >
                                                    {isRead
                                                        ? t('notifications.read')
                                                        : t('notifications.unread')}
                                                </span>
                                                <time className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {new Date(
                                                        notification.createdAt,
                                                    ).toLocaleString()}
                                                </time>
                                            </div>

                                            <p className={cn(
                                                'font-medium text-zinc-900 dark:text-zinc-50',
                                                isRead
                                                    ? 'opacity-75'
                                                    : 'font-semibold',
                                            )}>
                                                {notification.title ??
                                                    t('notifications.untitled')}
                                            </p>

                                            {notification.body && (
                                                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200 opacity-80">
                                                    {notification.body}
                                                </p>
                                            )}

                                            <div className="mt-auto flex items-center gap-3 pt-2">
                                                {!isRead && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            markRead(
                                                                notification.id,
                                                            )
                                                        }
                                                        className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                                    >
                                                        {t('notifications.markRead')}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        confirmRemove(
                                                            notification.id,
                                                        )
                                                    }
                                                    className="text-xs text-red-600 underline-offset-2 transition hover:underline dark:text-red-400"
                                                >
                                                    {t('notifications.delete')}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <ConfirmDialog
                        open={notificationToDelete !== null}
                        destructive
                        title={t('notifications.delete')}
                        message={t('notifications.confirmDelete')}
                        confirmLabel={t('notifications.delete')}
                        cancelLabel={t('notifications.cancel')}
                        onConfirm={remove}
                        onCancel={() => setNotificationToDelete(null)}
                    />
                </div>
            </div>
        </>
    );
}
