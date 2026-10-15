import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { store as unlockStore } from '@/routes/diary/unlock';

export default function Unlock() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        password: '',
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        post(unlockStore.url());
    }

    return (
        <>
            <Head title={t('unlock.title')} />

            <div className="flex min-h-screen flex-col items-center justify-center px-6 text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="w-full max-w-sm">
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                        {t('common.brand')}
                    </h1>
                    <p className="mb-6 text-sm text-zinc-700 dark:text-zinc-300">
                        {t('unlock.subtitle')}
                    </p>

                    <form
                        onSubmit={submit}
                        className="flex flex-col gap-4"
                        noValidate
                    >
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
                            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            {processing
                                ? t('unlock.submitting')
                                : t('unlock.submit')}
                        </button>
                    </form>

                    <div className="mt-6 flex justify-center">
                        <LanguageSwitcher className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" />
                    </div>
                </div>
            </div>
        </>
    );
}
