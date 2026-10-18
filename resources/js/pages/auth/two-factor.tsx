import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { login } from '@/routes';
import { store as twoFactorStore } from '@/routes/two-factor';

type TwoFactorChallengeProps = {
    trustDays: number;
};

export default function TwoFactorChallenge({
    trustDays,
}: TwoFactorChallengeProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        code: '',
        trust: true,
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        post(twoFactorStore.url());
    }

    return (
        <>
            <Head title={t('twoFactor.title')} />

            <div className="flex min-h-screen flex-col items-center justify-center px-6 text-[#1b1b18] dark:text-[#EDEDEC]">
                <div className="w-full max-w-sm">
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                        {t('common.brand')}
                    </h1>
                    <p className="mb-6 text-sm text-zinc-700 dark:text-zinc-300">
                        {t('twoFactor.subtitle')}
                    </p>

                    <form
                        onSubmit={submit}
                        className="flex flex-col gap-4"
                        noValidate
                    >
                        <div className="flex flex-col gap-1">
                            <label
                                htmlFor="code"
                                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                {t('twoFactor.code')}
                            </label>
                            <input
                                id="code"
                                type="text"
                                required
                                autoFocus
                                autoComplete="one-time-code"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={data.code}
                                onChange={(event) =>
                                    setData('code', event.target.value)
                                }
                                className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                            />
                            {errors.code && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {errors.code}
                                </p>
                            )}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <input
                                type="checkbox"
                                checked={data.trust}
                                onChange={(event) =>
                                    setData('trust', event.target.checked)
                                }
                                className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            {t('twoFactor.trust', { count: trustDays })}
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            {processing
                                ? t('twoFactor.submitting')
                                : t('twoFactor.submit')}
                        </button>
                    </form>

                    <Link
                        href={login.url()}
                        className="mt-6 inline-block text-sm text-zinc-700 underline-offset-2 transition hover:underline dark:text-zinc-300"
                    >
                        {t('common.backToLogin')}
                    </Link>

                    <div className="mt-6 flex justify-center">
                        <LanguageSwitcher className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" />
                    </div>
                </div>
            </div>
        </>
    );
}
