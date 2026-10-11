import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { recovery } from '@/routes/diary';
import { store as loginStore } from '@/routes/login';

export default function Login() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        post(loginStore.url());
    }

    return (
        <>
            <Head title={t('login.title')} />

            <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFC] px-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <div className="w-full max-w-sm">
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                        {t('common.brand')}
                    </h1>
                    <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                        {t('login.subtitle')}
                    </p>

                    <form
                        onSubmit={submit}
                        className="flex flex-col gap-4"
                        noValidate
                    >
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
                                autoFocus
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

                        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(event) =>
                                    setData('remember', event.target.checked)
                                }
                                className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            {t('login.remember')}
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            {processing
                                ? t('login.submitting')
                                : t('login.submit')}
                        </button>
                    </form>

                    <Link
                        href={recovery.url()}
                        className="mt-6 inline-block text-sm text-zinc-500 underline-offset-2 transition hover:underline dark:text-zinc-400"
                    >
                        {t('login.forgot')}
                    </Link>

                    <div className="mt-6 flex justify-center">
                        <LanguageSwitcher className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" />
                    </div>
                </div>
            </div>
        </>
    );
}
