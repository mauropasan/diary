import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ApiError,
    DiarioApi,
    NetworkError,
    normalizeServerUrl,
} from '@/native/api';
import { useAsyncAction } from '@/native/hooks';
import {
    finishLocalSetup,
    finishPairing,
    listKnownServers,
} from '@/native/session';
import { b64decode, deriveKek, sodiumReady, unwrapDek, b64encode } from '@/native/crypto';
import type { PairChallenge, PairSuccess } from '@/native/types';
import { KeyIcon, ServerIcon, WarningIcon } from '@/native/components/icons';

/**
 * First run — and the way back in after "forget this device".
 *
 * The user either points the app at a server (login, first-account
 * registration, or recovery-key sign-in, with the two-factor challenge when
 * the account has it) or chooses to use the diary with no account at all,
 * in which case everything stays on the device.
 */

type Step =
    | 'choose'
    | 'server'
    | 'login'
    | 'twoFactor'
    | 'recover'
    | 'register'
    | 'registerDone';

type State = {
    step: Step;
    serverUrl: string;
    email: string;
    password: string;
    name: string;
    code: string;
    useRecoveryCode: boolean;
    recoveryKey: string;
    challenge: PairChallenge | null;
    /** The just-registered account, held until its key has been shown. */
    pendingPair: PairSuccess | null;
    /** The just-registered account's recovery key, shown exactly once. */
    issuedRecoveryKey: string | null;
};

const initialState: State = {
    step: 'choose',
    serverUrl: '',
    email: '',
    password: '',
    name: '',
    code: '',
    useRecoveryCode: false,
    recoveryKey: '',
    challenge: null,
    pendingPair: null,
    issuedRecoveryKey: null,
};

/** Field-level messages the API returned (422s), keyed by form field. */
function apiFields(error: unknown): Record<string, string> {
    return error instanceof ApiError ? error.fields : {};
}

function errorMessage(error: unknown, t: (k: string) => string): string {
    if (error instanceof NetworkError) {
        return t('setup.offline');
    }

    if (error instanceof ApiError) {
        return error.message;
    }

    return t('setup.failed');
}

export default function SetupWizard(): React.JSX.Element {
    const { t } = useTranslation();
    const [state, setState] = useState<State>(initialState);
    const [known, setKnown] = useState<
        { serverUrl: string; email: string | null }[]
    >([]);

    useEffect(() => {
        void listKnownServers().then(setKnown);
    }, []);

    const patch = (next: Partial<State>): void =>
        setState((current) => ({ ...current, ...next }));

    /* ------------------------------ pairing ------------------------------ */

    async function derivePairDek(pair: PairSuccess): Promise<string> {
        if (typeof pair.dek === 'string' && pair.dek !== '') {
            return pair.dek;
        }

        await sodiumReady();

        const salt = pair.key?.kdf_salt;
        const wrapped = pair.key?.wrapped_key;

        if (!salt || !wrapped) {
            throw new Error('setup.missing-key-material');
        }

        const kek = deriveKek(state.password, salt);
        const dekBytes = unwrapDek(wrapped, kek);

        return b64encode(dekBytes);
    }

    const pairWith = useAsyncAction(
        async (pair: PairSuccess) => {
            const dekB64 = await derivePairDek(pair);

            await finishPairing({
                serverUrl: state.serverUrl,
                pair,
                dekB64,
            });
        },
    );

    const submitLogin = useAsyncAction(async () => {
        const api = new DiarioApi(normalizeServerUrl(state.serverUrl));
        const result = await api.login(state.email.trim(), state.password);

        if (result.two_factor_required === true) {
            patch({ challenge: result, code: '', step: 'twoFactor' });

            return;
        }

        await pairWith.run(result);
    });

    const submitTwoFactor = useAsyncAction(async () => {
        const challenge = state.challenge;

        if (challenge === null) {
            return;
        }

        const api = new DiarioApi(normalizeServerUrl(state.serverUrl));
        const pair = await api.twoFactor(
            challenge.challenge_id,
            state.code.trim(),
            state.useRecoveryCode,
        );

        await pairWith.run(pair);
    });

    const submitRecover = useAsyncAction(async () => {
        const api = new DiarioApi(normalizeServerUrl(state.serverUrl));
        const pair = await api.recover(
            state.email.trim(),
            state.recoveryKey.trim(),
            state.code.trim() || undefined,
        );

        await pairWith.run(pair);
    });

    const submitRegister = useAsyncAction(async () => {
        const api = new DiarioApi(normalizeServerUrl(state.serverUrl));
        const pair = await api.register({
            name: state.name.trim(),
            email: state.email.trim(),
            password: state.password,
            password_confirmation: state.password,
        });

        // Hold the pairing until the recovery key has been shown once — the
        // only moment the server ever reveals it.
        patch({
            issuedRecoveryKey: pair.recovery_key ?? null,
            pendingPair: pair,
            step: 'registerDone',
        });
    });

    const completeRegistration = useAsyncAction(async () => {
        const pair = state.pendingPair;

        if (pair === null) {
            return;
        }

        await pairWith.run(pair);
    });

    const goLocal = useAsyncAction(async () => {
        await finishLocalSetup();
    });

    const loginFields = apiFields(submitLogin.error);
    const registerFields = apiFields(submitRegister.error);
    const recoverFields = apiFields(submitRecover.error);

    /* ------------------------------- render ------------------------------ */

    const inputClass =
        'w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900';
    const buttonClass =
        'w-full rounded-xl bg-zinc-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900';
    const secondaryClass =
        'w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base font-medium transition active:scale-[0.99] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

    const busy =
        submitLogin.pending ||
        submitTwoFactor.pending ||
        submitRecover.pending ||
        submitRegister.pending ||
        goLocal.pending ||
        pairWith.pending;

    const errorOf = (action: { error: string | null }): string | null =>
        action.error === null ? null : errorMessage(action.error, t);

    const shownError =
        errorOf(submitLogin) ??
        errorOf(submitTwoFactor) ??
        errorOf(submitRecover) ??
        errorOf(submitRegister) ??
        errorOf(goLocal) ??
        errorOf(pairWith);

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-black dark:text-zinc-100">
            <div className="w-full max-w-sm">
                <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                    {t('common.brand')}
                </h1>
                <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('setup.subtitle')}
                </p>

                {shownError !== null && (
                    <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
                        <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        {shownError}
                    </p>
                )}

                {state.step === 'choose' && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className={buttonClass}
                            onClick={() => patch({ step: 'server' })}
                        >
                            {t('setup.connectServer')}
                        </button>
                        <button
                            type="button"
                            className={secondaryClass}
                            onClick={() => patch({ step: 'login' })}
                            hidden={known.length === 0}
                        >
                            {t('setup.connectKnown')}
                        </button>
                        <button
                            type="button"
                            className={secondaryClass}
                            onClick={() => void goLocal.run()}
                        >
                            {t('setup.useOffline')}
                        </button>
                        <p className="mt-2 text-center text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            {t('setup.offlineHint')}
                        </p>
                    </div>
                )}

                {state.step === 'choose' && known.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-2">
                        {known.map((server) => (
                            <li key={server.serverUrl}>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm transition active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900"
                                    onClick={() =>
                                        patch({
                                            serverUrl: server.serverUrl,
                                            email: server.email ?? '',
                                            step: 'login',
                                        })
                                    }
                                >
                                    <ServerIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">
                                            {server.serverUrl}
                                        </span>
                                        <span className="block truncate text-xs text-zinc-500">
                                            {server.email ?? ''}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {state.step === 'server' && (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            patch({ step: 'login' });
                        }}
                    >
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('setup.serverUrl')}
                            <input
                                type="url"
                                inputMode="url"
                                autoFocus
                                placeholder="https://example.com"
                                value={state.serverUrl}
                                onChange={(event) =>
                                    patch({ serverUrl: event.target.value })
                                }
                                className={inputClass}
                            />
                        </label>
                        <button type="submit" className={buttonClass}>
                            {t('setup.continue')}
                        </button>
                        <button
                            type="button"
                            className={secondaryClass}
                            onClick={() => patch({ step: 'choose' })}
                        >
                            {t('common.cancel')}
                        </button>
                    </form>
                )}

                {(state.step === 'login' ||
                    state.step === 'twoFactor' ||
                    state.step === 'recover' ||
                    state.step === 'register') && (
                    <p className="mb-3 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {state.serverUrl}
                    </p>
                )}

                {state.step === 'login' && (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitLogin.run();
                        }}
                    >
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.email')}
                            <input
                                type="email"
                                required
                                autoComplete="username"
                                autoFocus
                                value={state.email}
                                onChange={(event) =>
                                    patch({ email: event.target.value })
                                }
                                className={inputClass}
                            />
                            {loginFields.email && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {loginFields.email}
                                </span>
                            )}
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.password')}
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                value={state.password}
                                onChange={(event) =>
                                    patch({ password: event.target.value })
                                }
                                className={inputClass}
                            />
                            {loginFields.password && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {loginFields.password}
                                </span>
                            )}
                        </label>
                        <button
                            type="submit"
                            className={buttonClass}
                            disabled={busy}
                        >
                            {busy
                                ? t('login.submitting')
                                : t('login.submit')}
                        </button>
                        <div className="flex justify-between text-sm">
                            <button
                                type="button"
                                className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                                onClick={() => patch({ step: 'recover' })}
                            >
                                {t('setup.useRecoveryKey')}
                            </button>
                            <button
                                type="button"
                                className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                                onClick={() => patch({ step: 'register' })}
                            >
                                {t('setup.createFirstAccount')}
                            </button>
                        </div>
                        <button
                            type="button"
                            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
                            onClick={() => patch({ step: 'choose' })}
                        >
                            {t('common.cancel')}
                        </button>
                    </form>
                )}

                {state.step === 'twoFactor' && (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitTwoFactor.run();
                        }}
                    >
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t('setup.twoFactorHint')}
                        </p>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {state.useRecoveryCode
                                ? t('setup.recoveryCode')
                                : t('setup.twoFactorCode')}
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                value={state.code}
                                onChange={(event) =>
                                    patch({ code: event.target.value })
                                }
                                className={inputClass}
                            />
                        </label>
                        <button
                            type="submit"
                            className={buttonClass}
                            disabled={busy}
                        >
                            {t('login.submit')}
                        </button>
                        <button
                            type="button"
                            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
                            onClick={() =>
                                patch({
                                    useRecoveryCode: !state.useRecoveryCode,
                                    code: '',
                                })
                            }
                        >
                            {state.useRecoveryCode
                                ? t('setup.useAuthenticator')
                                : t('setup.useRecoveryCode')}
                        </button>
                    </form>
                )}

                {state.step === 'recover' && (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitRecover.run();
                        }}
                    >
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t('setup.recoverHint')}
                        </p>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.email')}
                            <input
                                type="email"
                                required
                                autoFocus
                                value={state.email}
                                onChange={(event) =>
                                    patch({ email: event.target.value })
                                }
                                className={inputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('setup.recoveryKey')}
                            <input
                                type="text"
                                required
                                autoComplete="off"
                                spellCheck={false}
                                value={state.recoveryKey}
                                onChange={(event) =>
                                    patch({ recoveryKey: event.target.value })
                                }
                                className={inputClass}
                            />
                            {recoverFields.recovery_key && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {recoverFields.recovery_key}
                                </span>
                            )}
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('setup.twoFactorCode')}
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={state.code}
                                onChange={(event) =>
                                    patch({ code: event.target.value })
                                }
                                className={inputClass}
                            />
                            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                {t('setup.recoverTwoFactorHint')}
                            </span>
                            {recoverFields.code && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {recoverFields.code}
                                </span>
                            )}
                        </label>
                        <button
                            type="submit"
                            className={buttonClass}
                            disabled={busy}
                        >
                            {t('login.submit')}
                        </button>
                        <button
                            type="button"
                            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
                            onClick={() => patch({ step: 'login' })}
                        >
                            {t('common.backToLogin')}
                        </button>
                    </form>
                )}

                {state.step === 'register' && (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitRegister.run();
                        }}
                    >
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t('setup.registerHint')}
                        </p>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.name')}
                            <input
                                type="text"
                                required
                                autoFocus
                                value={state.name}
                                onChange={(event) =>
                                    patch({ name: event.target.value })
                                }
                                className={inputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.email')}
                            <input
                                type="email"
                                required
                                value={state.email}
                                onChange={(event) =>
                                    patch({ email: event.target.value })
                                }
                                className={inputClass}
                            />
                            {registerFields.email && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {registerFields.email}
                                </span>
                            )}
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                            {t('common.password')}
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={state.password}
                                onChange={(event) =>
                                    patch({ password: event.target.value })
                                }
                                className={inputClass}
                            />
                            {registerFields.password && (
                                <span className="text-xs font-normal text-red-600 dark:text-red-400">
                                    {registerFields.password}
                                </span>
                            )}
                        </label>
                        <button
                            type="submit"
                            className={buttonClass}
                            disabled={busy}
                        >
                            {t('setup.createAccount')}
                        </button>
                        <button
                            type="button"
                            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
                            onClick={() => patch({ step: 'login' })}
                        >
                            {t('common.backToLogin')}
                        </button>
                    </form>
                )}

                {state.step === 'registerDone' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t('setup.recoveryKeyOnce')}
                        </p>
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/50">
                            <KeyIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <code className="min-w-0 break-all text-sm leading-6 text-amber-900 select-all dark:text-amber-100">
                                {state.issuedRecoveryKey ?? ''}
                            </code>
                        </div>
                        <button
                            type="button"
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => void completeRegistration.run()}
                        >
                            {t('setup.recoveryKeySaved')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

