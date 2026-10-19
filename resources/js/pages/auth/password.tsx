import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { home } from '@/routes';
import { update as passwordUpdate } from '@/routes/diary/password';

export default function Password() {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        put(passwordUpdate.url(), {
            onSuccess: () => reset(),
        });
    }

    return (
        <>
            <Head title={t('password.title')} />

            <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFC] px-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="w-full max-w-sm">
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                        {t('password.heading')}
                    </h1>
                    <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                        {t('password.subtitle')}
                    </p>

                    <form
                        onSubmit={submit}
                        className="flex flex-col gap-4"
                        noValidate
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
                                autoFocus
                                value={data.current_password}
                                onChange={(event) =>
                                    setData(
                                        'current_password',
                                        event.target.value,
                                    )
                                }
                                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                            />
                            {errors.current_password && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {errors.current_password}
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
                            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            {processing
                                ? t('password.submitting')
                                : t('password.submit')}
                        </button>
                    </form>

                    <Link
                        href={home.url()}
                        className="mt-6 inline-block text-sm text-zinc-500 underline-offset-2 transition hover:underline dark:text-zinc-400"
                    >
                        {t('common.backToDiary')}
                    </Link>

                    <div className="mt-6 flex justify-center">
                        <LanguageSwitcher className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" />
                    </div>
                </div>
            </div>
        </>
    );
}
