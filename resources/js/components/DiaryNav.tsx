import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { cn } from '@/lib/utils';
import { index as adminUsers } from '@/routes/admin/users';
import { home, logout } from '@/routes';
import {
    exportMethod as diaryExport,
    mood as diaryMood,
    notes as diaryNotes,
    password as diaryPassword,
    schedule as diarySchedule,
    search as diarySearch,
} from '@/routes/diary';

const iconButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const globeButtonClass =
    'flex h-9 items-center gap-1 rounded-md px-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const mobileLinkClass =
    'block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50';

const switcherClass =
    'rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-600 outline-none transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300';

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

function CalendarIcon(): React.JSX.Element {
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
        </svg>
    );
}

function SearchIcon(): React.JSX.Element {
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
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function MoreIcon(): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
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

type DiaryNavProps = {
    onBeforeNavigate?: () => void;
    onLogout?: () => void;
};

type NavLink = {
    key: string;
    label: string;
    href: string;
    icon?: React.JSX.Element;
};

/**
 * Shared navigation for the diary pages. On wider screens the primary links
 * are icon-only and the extras live behind an overflow menu. On phones the
 * whole thing collapses into a hamburger button.
 */
export default function DiaryNav({
    onBeforeNavigate,
    onLogout,
}: DiaryNavProps) {
    const [open, setOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const { t } = useTranslation();

    const isAdmin = usePage().props.auth.user.is_admin === true;

    const primary: NavLink[] = [
        {
            key: 'home',
            label: t('nav.today'),
            href: home.url(),
            icon: <CalendarIcon />,
        },
        {
            key: 'search',
            label: t('nav.search'),
            href: diarySearch.url(),
            icon: <SearchIcon />,
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
            icon: <NotesIcon />,
        },
    ];

    const secondary: NavLink[] = [
        { key: 'export', label: t('nav.export'), href: diaryExport.url() },
        {
            key: 'password',
            label: t('nav.password'),
            href: diaryPassword.url(),
        },
    ];

    if (isAdmin) {
        secondary.push({
            key: 'users',
            label: t('nav.users'),
            href: adminUsers.url(),
        });
    }

    const links = [...primary, ...secondary];

    const logoutHandler = onLogout ?? (() => router.post(logout.url()));

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

    useEffect(() => {
        if (!moreOpen) {
            return;
        }

        function closeOnEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setMoreOpen(false);
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [moreOpen]);

    return (
        <nav className="flex items-center">
            <div className="hidden items-center gap-1 sm:flex">
                {primary.map((link) => (
                    <Link
                        key={link.key}
                        href={link.href}
                        onBefore={onBeforeNavigate}
                        aria-label={link.label}
                        title={link.label}
                        className={iconButtonClass}
                    >
                        {link.icon}
                    </Link>
                ))}

                <ThemeSwitcher className={iconButtonClass} />

                <LanguageSwitcher compact className={globeButtonClass} />

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMoreOpen((value) => !value)}
                        aria-expanded={moreOpen}
                        aria-label={t('nav.more')}
                        title={t('nav.more')}
                        className={iconButtonClass}
                    >
                        <MoreIcon />
                    </button>

                    {moreOpen && (
                        <>
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-hidden="true"
                                onClick={() => setMoreOpen(false)}
                                className="fixed inset-0 z-10"
                            />
                            <div className="absolute top-full right-0 z-20 mt-2 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                                {secondary.map((link) => (
                                    <Link
                                        key={link.key}
                                        href={link.href}
                                        onBefore={onBeforeNavigate}
                                        onClick={() => setMoreOpen(false)}
                                        className={mobileLinkClass}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>

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
                            <ThemeSwitcher layout="list" />
                            <div className="px-3 py-2">
                                <LanguageSwitcher
                                    className={cn('w-full', switcherClass)}
                                />
                            </div>
                            {links.map((link) => (
                                <Link
                                    key={link.key}
                                    href={link.href}
                                    onBefore={onBeforeNavigate}
                                    onClick={() => setOpen(false)}
                                    className={mobileLinkClass}
                                >
                                    {link.label}
                                </Link>
                            ))}
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
            </div>
        </nav>
    );
}
