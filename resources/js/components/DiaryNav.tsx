import type { PendingVisit } from '@inertiajs/core';
import { Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { home, logout } from '@/routes';
import { cn } from '@/lib/utils';
import NotificationsPopup from '@/components/NotificationsPopup';
import { index as adminUsersIndex } from '@/routes/admin/users';
import {
    destroy as notificationDestroy,
    read as notificationMarkRead,
    list as notificationList,
    readAll as notificationMarkAllRead,
} from '@/routes/diary/notifications';
import {
    lock as diaryLock,
    mood as diaryMood,
    notes as diaryNotes,
    schedule as diarySchedule,
    settings as diarySettings,
} from '@/routes/diary';

const iconButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const mobileLinkClass =
    'block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50';

function MenuIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function CloseIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function CalendarIcon({ day }: { day?: number }): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
            {day !== undefined && (
                <text
                    x="12"
                    y="17"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fontWeight="600"
                    fill="currentColor"
                    stroke="none"
                >
                    {day}
                </text>
            )}
        </svg>
    );
}

function MoodIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="9" />
            <line x1="9" y1="9" x2="9" y2="9" />
            <line x1="15" y1="9" x2="15" y2="9" />
            <path d="M8 14a4 4 0 0 0 8 0" />
        </svg>
    );
}

function NotesIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l5-5V5a2 2 0 0 0-2-2Z" />
            <path d="M14 21v-4a2 2 0 0 1 2-2h4" />
            <line x1="8" y1="9" x2="14" y2="9" />
            <line x1="8" y1="13" x2="12" y2="13" />
        </svg>
    );
}

function SettingsIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
    );
}

function LockIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function LogoutIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

function UsersIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function BellIcon({ unread }: { unread: boolean }): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
                'h-4 w-4',
                unread
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400',
            )}
            aria-hidden="true"
        >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

type DiaryNavProps = {
    onBeforeNavigate?: (visit: PendingVisit) => boolean | void;
    onLogout?: () => void;
    onLock?: () => void;
};

type NavLink = {
    key: string;
    label: string;
    href: string;
    icon?: React.JSX.Element;
};

/**
 * Shared navigation for the diary pages. On wider screens the primary links
 * are icon-only. On phones the whole thing collapses into a hamburger button.
 */
export default function DiaryNav({
    onBeforeNavigate,
    onLogout,
    onLock,
}: DiaryNavProps) {
    const [open, setOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationsList, setNotificationsList] = useState<
        Array<{
            id: number;
            title: string | null;
            body: string | null;
            readAt: string | null;
            createdAt: string;
        }>
    >([]);
    const { t } = useTranslation();
    const pageUrl = usePage().url;
    const { auth } = usePage().props;
    const todayNumber = new Date().getDate();
    const csrfToken =
        (usePage().props as { csrfToken?: string }).csrfToken ?? '';
    const sharedCount =
        (usePage().props as { notificationCount?: number }).notificationCount ??
        0;
    const [unreadCount, setUnreadCount] = useState(sharedCount);

    function csrfHeaders(): HeadersInit {
        return {
            'X-CSRF-TOKEN': csrfToken,
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
    }

    const loadNotifications = useCallback(async (): Promise<void> => {
        const response = await fetch(notificationList.url(), {
            headers: { Accept: 'application/json' },
        });

        // Expired sessions answer with a redirect to the login page, so only
        // trust a JSON body before replacing the list.
        if (
            !response.ok ||
            !(response.headers.get('content-type') ?? '').includes('json')
        ) {
            return;
        }

        const list: Array<{
            id: number;
            title: string | null;
            body: string | null;
            readAt: string | null;
            createdAt: string;
        }> = await response.json();
        setNotificationsList(list);
        setUnreadCount(list.filter((item) => item.readAt === null).length);
    }, []);

    async function markNotificationRead(id: number): Promise<void> {
        const response = await fetch(notificationMarkRead.url(id), {
            method: 'PATCH',
            headers: csrfHeaders(),
        });

        if (!response.ok) {
            return;
        }

        setNotificationsList((list) =>
            list.map((notification) =>
                notification.id === id
                    ? { ...notification, readAt: new Date().toISOString() }
                    : notification,
            ),
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    async function markAllNotificationsRead(): Promise<void> {
        const response = await fetch(notificationMarkAllRead.url(), {
            method: 'PATCH',
            headers: csrfHeaders(),
        });

        if (!response.ok) {
            return;
        }

        setNotificationsList((list) =>
            list.map((notification) => ({
                ...notification,
                readAt: new Date().toISOString(),
            })),
        );
        setUnreadCount(0);
    }

    async function removeNotification(id: number): Promise<void> {
        const response = await fetch(notificationDestroy.url(id), {
            method: 'DELETE',
            headers: csrfHeaders(),
        });

        if (!response.ok) {
            return;
        }

        const removed = notificationsList.find(
            (notification) => notification.id === id,
        );
        setNotificationsList((list) =>
            list.filter((notification) => notification.id !== id),
        );
        if (removed?.readAt === null) {
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        }
    }

    function isActive(href: string): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        return new URL(href, window.location.origin).pathname === pageUrl;
    }

    const primary: NavLink[] = [
        {
            key: 'home',
            label: `${t('nav.today')} (${todayNumber})`,
            href: home.url(),
            icon: <CalendarIcon day={todayNumber} />,
        },
        {
            key: 'mood',
            label: t('nav.mood'),
            href: diaryMood.url(),
            icon: <MoodIcon />,
        },
        {
            key: 'notes',
            label: t('nav.notes'),
            href: diaryNotes.url(),
            icon: <NotesIcon />,
        },
        {
            key: 'schedule',
            label: t('nav.schedule'),
            href: diarySchedule.url(),
            icon: <CalendarIcon />,
        },
        {
            key: 'settings',
            label: t('nav.settings'),
            href: diarySettings.url(),
            icon: <SettingsIcon />,
        },
    ];

    const logoutHandler = onLogout ?? (() => router.post(logout.url()));
    const lockHandler = onLock ?? (() => router.post(diaryLock.url()));

    useEffect(() => {
        if (!open) {
            return;
        }

        function closeOnEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    // Refresh the badge while the page stays open so a notification pops at
    // its trigger moment without waiting for a navigation. Hidden tabs are
    // skipped to avoid pointless polling.
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (!document.hidden) {
                void loadNotifications();
            }
        }, 60_000);

        return () => window.clearInterval(interval);
    }, [loadNotifications]);

    return (
        <nav className="flex items-center">
            <div className="hidden items-center gap-1 sm:flex">
                {primary.map((link) => (
                    <Link
                        key={link.key}
                        href={link.href}
                        onBefore={onBeforeNavigate}
                        aria-current={isActive(link.href) ? 'page' : undefined}
                        aria-label={link.label}
                        title={link.label}
                        className={iconButtonClass}
                    >
                        {link.icon}
                    </Link>
                ))}

                {auth.user.is_admin && (
                    <Link
                        href={adminUsersIndex.url()}
                        onBefore={onBeforeNavigate}
                        aria-current={
                            isActive(adminUsersIndex.url()) ? 'page' : undefined
                        }
                        aria-label={t('nav.users')}
                        title={t('nav.users')}
                        className={iconButtonClass}
                    >
                        <UsersIcon />
                    </Link>
                )}

                <div className="relative">
                    <button
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => {
                            const next = !notificationsOpen;
                            setNotificationsOpen(next);
                            if (next) {
                                void loadNotifications();
                            }
                        }}
                        aria-label={t('notifications.navLabel')}
                        title={t('notifications.navLabel')}
                        className={iconButtonClass}
                        aria-expanded={notificationsOpen}
                    >
                        <BellIcon unread={unreadCount > 0} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-zinc-50">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <NotificationsPopup
                        open={notificationsOpen}
                        onClose={() => setNotificationsOpen(false)}
                        list={notificationsList}
                        onMarkRead={markNotificationRead}
                        onMarkAllRead={markAllNotificationsRead}
                        onDelete={removeNotification}
                    />
                </div>

                <button
                    type="button"
                    onClick={lockHandler}
                    aria-label={t('nav.lock')}
                    title={t('nav.lock')}
                    className={iconButtonClass}
                >
                    <LockIcon />
                </button>

                <button
                    type="button"
                    onClick={logoutHandler}
                    aria-label={t('nav.logout')}
                    title={t('nav.logout')}
                    className={iconButtonClass}
                >
                    <LogoutIcon />
                </button>
            </div>

            <div className="relative sm:hidden">
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                    {open ? <CloseIcon /> : <MenuIcon />}
                </button>

                {open && (
                    <>
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-10 sm:hidden"
                        />
                        <div className="absolute top-full right-0 z-20 mt-2 w-70 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                            {primary.map((link) => (
                                <Link
                                    key={link.key}
                                    href={link.href}
                                    onBefore={onBeforeNavigate}
                                    onClick={() => setOpen(false)}
                                    aria-current={
                                        isActive(link.href) ? 'page' : undefined
                                    }
                                    className={mobileLinkClass}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {auth.user.is_admin && (
                                <Link
                                    href={adminUsersIndex.url()}
                                    onBefore={onBeforeNavigate}
                                    onClick={() => setOpen(false)}
                                    aria-current={
                                        isActive(adminUsersIndex.url())
                                            ? 'page'
                                            : undefined
                                    }
                                    className={mobileLinkClass}
                                >
                                    {t('nav.users')}
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    lockHandler();
                                }}
                                className={mobileLinkClass}
                            >
                                {t('nav.lock')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    setNotificationsOpen(true);
                                    void loadNotifications();
                                }}
                                className={mobileLinkClass}
                            >
                                {t('notifications.navLabel')}
                                {unreadCount > 0 ? (
                                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-zinc-50">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                ) : null}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    logoutHandler();
                                }}
                                className={mobileLinkClass}
                            >
                                {t('nav.logout')}
                            </button>
                        </div>
                    </>
                )}

                <NotificationsPopup
                    open={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                    list={notificationsList}
                    onMarkRead={markNotificationRead}
                    onMarkAllRead={markAllNotificationsRead}
                    onDelete={removeNotification}
                />
            </div>
        </nav>
    );
}
