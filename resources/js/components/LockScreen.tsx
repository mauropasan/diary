import { useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { store as unlockStore } from '@/routes/diary/unlock';

type LockScreenProps = {
    onUnlocked?: () => void;
};

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function LockScreen({ onUnlocked }: LockScreenProps) {
    const { t } = useTranslation();
    const panelRef = useRef<HTMLDivElement>(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    useEffect(() => {
        const panel = panelRef.current;

        if (!panel) {
            return;
        }

        const root: HTMLElement = panel;

        function trapFocus(event: KeyboardEvent): void {
            if (event.key !== 'Tab') {
                return;
            }

            const focusable = Array.from(
                root.querySelectorAll<HTMLElement>(FOCUSABLE),
            );

            if (focusable.length === 0) {
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || active === root) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', trapFocus);

        return () => document.removeEventListener('keydown', trapFocus);
    }, []);

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        post(unlockStore.url(), {
            onSuccess: () => {
                reset();
                onUnlocked?.();
            },
        });
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lock-screen-heading"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFDFC]/95 px-6 backdrop-blur-sm dark:bg-[#0a0a0a]/95"
        >
            <div
                ref={panelRef}
                className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-[#1b1b18] shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-[#EDEDEC]"
            >
                <h1
                    id="lock-screen-heading"
                    className="mb-1 text-lg font-semibold tracking-tight"
                >
                    {t('lock.heading')}
                </h1>
                <p className="mb-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {t('lock.body')}
                </p>

                <form
                    onSubmit={submit}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <div className="flex flex-col gap-1">
                        <label
                            htmlFor="lock-password"
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            {t('common.password')}
                        </label>
                        <input
                            id="lock-password"
                            type="password"
                            required
                            autoFocus
                            value={data.password}
                            onChange={(event) =>
                                setData('password', event.target.value)
                            }
                            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                        {processing ? t('lock.submitting') : t('lock.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
