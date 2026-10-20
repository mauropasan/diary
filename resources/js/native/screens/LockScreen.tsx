import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncAction, useSession } from '@/native/hooks';
import { unlockWithBiometric, unlockWithPassword } from '@/native/session';
import {
    FingerprintIcon,
    LockIcon,
    WarningIcon,
} from '@/native/components/icons';

/**
 * The lock screen of a paired diary.
 *
 * The password is verified right here on the device — the server's wrapped
 * key is stored locally — so opening the diary never waits for a connection.
 * When the device biometric lock is enabled, the fingerprint opens the
 * Keystore copy of the key instead (the only way in for local-only devices).
 */
export default function LockScreen(): React.JSX.Element {
    const { t } = useTranslation();
    const { biometric, error, profile } = useSession();
    const [password, setPassword] = useState('');
    const [biometricBusy, setBiometricBusy] = useState(false);

    const localMode = profile?.mode === 'local';

    const unlock = useAsyncAction(async () => {
        await unlockWithPassword(password);
        setPassword('');
    });

    const tryBiometric = async (): Promise<void> => {
        setBiometricBusy(true);

        try {
            await unlockWithBiometric();
        } catch {
            // A cancelled or failed prompt leaves the screen as it was.
        } finally {
            setBiometricBusy(false);
        }
    };

    const messageFor = (key: string | null): string | null => {
        if (key === null || key === '') {
            return null;
        }

        switch (key) {
            case 'session.wrong-password':
                return t('session.wrongPassword');
            case 'session.no-key-material':
                return t('session.noKeyMaterial');
            case 'sync.reauth':
            case 'session.need-reconnect':
                return t('session.needReconnect');
            case 'session.offline':
                return t('session.offline');
            default:
                // API errors carry their own (already localized) message.
                return key.startsWith('session.') ? t('setup.failed') : key;
        }
    };

    const shown = messageFor(unlock.error) ?? messageFor(error);

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-6 text-zinc-900 dark:bg-black dark:text-zinc-100">
            <div className="w-full max-w-xs text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
                    <LockIcon className="h-8 w-8" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                    {t('unlock.title')}
                </h1>
                <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {localMode
                        ? t('session.localHint')
                        : t('session.offlineHint')}
                </p>

                {shown !== null && (
                    <p className="mb-4 flex items-start justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
                        <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        {shown}
                    </p>
                )}

                {!localMode && (
                    <form
                        className="flex flex-col gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void unlock.run();
                        }}
                    >
                        <input
                            type="password"
                            autoComplete="current-password"
                            placeholder={t('common.password')}
                            autoFocus
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                            disabled={unlock.pending || password === ''}
                        >
                            {unlock.pending
                                ? t('unlock.submitting')
                                : t('unlock.submit')}
                        </button>
                    </form>
                )}

                {biometric && (
                    <button
                        type="button"
                        onClick={() => void tryBiometric()}
                        disabled={biometricBusy}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <FingerprintIcon className="h-5 w-5" />
                        {t('session.useBiometric')}
                    </button>
                )}

                {profile?.token === null && !localMode && (
                    <p className="mt-6 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        {t('session.needReconnect')}
                    </p>
                )}
            </div>
        </div>
    );
}
