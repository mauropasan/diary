import { Link } from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { notifications as notificationsIndex } from '@/routes/diary';
import {
    read as notificationMarkRead,
} from '@/routes/diary/notifications';

type Notification = {
    id: number;
    title: string | null;
    body: string | null;
    readAt: string | null;
    createdAt: string;
};

type NotificationsPopupProps = {
    open: boolean;
    onClose: () => void;
    list: Notification[];
    onMarkRead: (id: number) => void;
    onMarkAllRead: () => void;
    onDismiss: (id: number) => void;
};

export default function NotificationsPopup({
    open,
    onClose,
    list,
    onMarkRead,
    onMarkAllRead,
    onDismiss,
}: NotificationsPopupProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const unreadCount = list.filter(
        (notification) => notification.readAt === null,
    ).length;

    // Close the popup when clicking outside of it.
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleClickOutside(event: MouseEvent): void {
            if (!(event.target as Element).closest('[data-popup]')) {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, onClose]);

    async function markRead(id: number): Promise<void> {
        await fetch(notificationMarkRead.url(id), { method: 'PATCH' });
        onMarkRead(id);
    }

    async function dismiss(id: number): Promise<void> {
        await fetch(notificationMarkRead.url(id), { method: 'PATCH' });
        onDismiss(id);
    }

    if (!open) {
        return null;
    }

    return (
        <div
            data-popup
            className="absolute top-full right-0 z-20 mt-2 w-72 rounded-md border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
            <div className="px-3 py-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('notifications.title')}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    ×
                </button>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={onMarkAllRead}
                        className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                    >
                        {t('notifications.markAllRead')}
                    </button>
                )}
            </div>

            {list.length === 0 && (
                <div className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('notifications.empty')}
                </div>
            )}

            {list.length > 0 && (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {list.map((notification) => {
                        const isRead = notification.readAt !== null;

                        return (
                            <li
                                key={notification.id}
                                className="px-3 py-3"
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
                                    isRead ? 'opacity-75' : 'font-semibold',
                                )}>
                                    {notification.title ??
                                        t('notifications.untitled')}
                                </p>

                                {notification.body && (
                                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200 opacity-80">
                                        {notification.body}
                                    </p>
                                )}

                                <div className="mt-2 flex items-center gap-3">
                                    {!isRead && (
                                        <button
                                            type="button"
                                            onClick={() => markRead(notification.id)}
                                            className="text-xs text-zinc-600 underline-offset-2 transition hover:underline dark:text-zinc-300"
                                        >
                                            {t('notifications.markRead')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => dismiss(notification.id)}
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

            <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800">
                <Link
                    href={notificationsIndex.url()}
                    className="block w-full rounded-md px-3 py-2 text-sm text-left text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={onClose}
                >
                    {t('notifications.viewAll')}
                </Link>
            </div>
        </div>
    );
}
