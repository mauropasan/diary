import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { ApiError, DiarioApi, NetworkError, normalizeServerUrl } from '@/native/api';
import { db, kvGet, kvSet, KV } from '@/native/db';
import { useSession, useSyncState } from '@/native/hooks';
import { biometricAvailable } from '@/native/keystore';
import { navigate } from '@/native/router';
import {
    currentDek,
    finishPairing,
    forgetProfile,
    setBiometricEnabled,
    setLockMinutes,
} from '@/native/session';
import { rekeyLocalData, syncNow } from '@/native/sync';
import { useAppearance } from '@/hooks/use-appearance';
import i18n, { persistLocale } from '@/i18n';
import { LOCALE_NAMES, SUPPORTED_LOCALES } from '@/i18n/locales';
import {
    CheckIcon,
    ChevronRightIcon,
    CloudDoneIcon,
    CloudOffIcon,
    DownloadIcon,
    FingerprintIcon,
    GlobeIcon,
    LockIcon,
    LogoutIcon,
    PaletteIcon,
    PersonIcon,
    RefreshIcon,
    ServerIcon,
} from '@/native/components/icons';
import type { PairChallenge, PairSuccess } from '@/native/types';

/**
 * Device settings — appearance, language, account/sync, security, and the
 * export/update actions.
 *
 * Everything here is local-first: rows read straight from IndexedDB and the
 * session/sync stores, and no action needs the network except the account
 * ones (which degrade to "unreachable" rather than blocking).
 */

type IconComponent = React.ComponentType<{ className?: string }>;

/* ------------------------------ UI helpers ------------------------------ */

function Card({ title, children }: { title?: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <section className="mb-6">
            {title !== undefined && (
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {title}
                </h2>
            )}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-800">
                {children}
            </div>
        </section>
    );
}

function Row({
    icon: Icon,
    label,
    value,
  onClick,
    chevron,
    danger,
    children,
}: {
    icon?: IconComponent;
    label: string;
    value?: React.ReactNode;
    onClick?: () => void;
    chevron?: boolean;
    danger?: boolean;
    children?: React.ReactNode;
}): React.JSX.Element {
    const body = (
        <div className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            {Icon !== undefined && (
                <Icon className={`h-5 w-5 shrink-0 ${danger ? 'text-red-500' : 'text-zinc-400'}`} />
            )}
            <span className={`min-w-0 flex-1 text-sm ${danger ? 'font-medium text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {label}
            </span>
            {value !== undefined && (
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">{value}</span>
            )}
            {children}
            {(chevron ?? false) && <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />}
        </div>
    );

    if (onClick === undefined) {
        return <div>{body}</div>;
    }

    return (
        <button type="button" onClick={onClick} className="block w-full transition active:bg-zinc-50 dark:active:bg-zinc-800/60">
            {body}
        </button>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }): React.JSX.Element {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        >
            <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
            />
        </button>
    );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }): React.JSX.Element {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
            <div
                className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl dark:bg-zinc-900"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <h3 className="mb-4 text-center text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                {children}
            </div>
        </div>
    );
}

function Btn({
    children,
    onClick,
    variant = 'primary',
    disabled,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}): React.JSX.Element {
    const styles =
        variant === 'primary'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : variant === 'danger'
              ? 'bg-red-600 text-white'
              : 'border border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled ?? false}
            className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 ${styles}`}
        >
            {children}
        </button>
    );
}

function Field({
    label,
    value,
    onChange,
    type = 'text',
    autoFocus,
}: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    type?: string;
    autoFocus?: boolean;
}): React.JSX.Element {
    return (
        <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            <input
                type={type}
                value={value}
                autoFocus={autoFocus ?? false}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
        </label>
    );
}

/* --------------------------- connect to server -------------------------- */

/**
 * Connect a local-only diary to a server: sign in (with the two-factor
 * challenge when the account has it), re-encrypt everything on the device
 * under the account's DEK, mark it all dirty and push.
 */
function ConnectSheet({ onClose }: { onClose: () => void }): React.JSX.Element {
    const { t } = useTranslation();
    const [serverUrl, setServerUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [challenge, setChallenge] = useState<PairChallenge | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const errorMessage = (caught: unknown): string => {
        if (caught instanceof NetworkError) {
            return t('setup.offline');
        }

        if (caught instanceof ApiError) {
            return caught.message;
        }

        return t('setup.failed');
    };

    const merge = async (pair: PairSuccess, url: string): Promise<void> => {
        const oldDek = currentDek();

        // Pairing stores the new DEK in memory and on disk; the local rows
        // are still encrypted under the old one, so re-key them before the
        // first push.
        await finishPairing({ serverUrl: url, pair, dekB64: pair.dek });

        if (oldDek !== null && oldDek !== pair.dek) {
            await rekeyLocalData(oldDek, pair.dek);
        }

        void syncNow('connect').catch(() => undefined);
        setDone(true);
    };

    const submitCredentials = async (): Promise<void> => {
        setBusy(true);
        setError(null);

        try {
            const url = normalizeServerUrl(serverUrl);
            const api = new DiarioApi(url);
            const result = await api.login(email.trim(), password);

            if (result.two_factor_required === true) {
                setChallenge(result);
                setCode('');
                return;
            }

            await merge(result, url);
        } catch (caught) {
            setError(errorMessage(caught));
        } finally {
            setBusy(false);
        }
    };

    const submitCode = async (): Promise<void> => {
        if (challenge === null) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const url = normalizeServerUrl(serverUrl);
            const api = new DiarioApi(url);
            const pair = await api.twoFactor(challenge.challenge_id, code.trim());

            await merge(pair, url);
        } catch (caught) {
            setError(errorMessage(caught));
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <Sheet title={t('native.settings.connected')} onClose={onClose}>
                <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">{t('native.settings.connect_done')}</p>
                <Btn onClick={onClose}>{t('common.close')}</Btn>
            </Sheet>
        );
    }

    if (challenge !== null) {
        return (
            <Sheet title={t('setup.twoFactorCode')} onClose={onClose}>
                <p className="mb-3 text-center text-sm text-zinc-600 dark:text-zinc-400">{t('setup.twoFactorHint')}</p>
                <Field label={t('setup.twoFactorCode')} value={code} onChange={setCode} autoFocus />
                {error !== null && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex flex-col gap-2">
                    <Btn onClick={() => void submitCode()} disabled={busy || code.trim() === ''}>
                        {t('login.submit')}
                    </Btn>
                    <Btn variant="secondary" onClick={() => { setChallenge(null); setError(null); }} disabled={busy}>
                        {t('common.cancel')}
                    </Btn>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet title={t('native.settings.connect_server')} onClose={onClose}>
            <p className="mb-4 text-center text-xs leading-5 text-zinc-500 dark:text-zinc-400">{t('native.settings.connect_merge_note')}</p>
            <Field label={t('setup.serverUrl')} value={serverUrl} onChange={setServerUrl} autoFocus />
            <Field label={t('common.email')} value={email} onChange={setEmail} type="email" />
            <Field label={t('common.password')} value={password} onChange={setPassword} type="password" />
            {error !== null && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex flex-col gap-2">
                <Btn onClick={() => void submitCredentials()} disabled={busy}>
                    {t('native.settings.connect_server')}
                </Btn>
                <Btn variant="secondary" onClick={onClose} disabled={busy}>
                    {t('common.cancel')}
                </Btn>
            </div>
        </Sheet>
    );
}

/* ------------------------------- the screen ------------------------------ */

const LOCK_OPTIONS = [1, 5, 15, 30, 60];

function lockLabel(t: (key: string, options?: Record<string, unknown>) => string, minutes: number): string {
    return minutes >= 60 ? t('native.settings.lock_60') : t('native.settings.lock_minutes', { n: minutes });
}

export default function SettingsScreen(): React.JSX.Element {
    const { t } = useTranslation();
    const { appearance, setAppearance } = useAppearance();
    const { profile } = useSession();
    const { lastSyncAt, running } = useSyncState();

    const [language, setLanguage] = useState<string>(i18n.resolvedLanguage ?? 'en');
    const [lockMinutes, setLockMinutesState] = useState(15);
    const [biometricOn, setBiometricOn] = useState(false);
    const [biometricReady, setBiometricReady] = useState(false);
    const [counts, setCounts] = useState({ entries: 0, notes: 0, schedules: 0 });
    const [latestVersion, setLatestVersion] = useState<number | null>(null);
    const [installedVersion, setInstalledVersion] = useState<number | null>(null);

    const [connectOpen, setConnectOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [lockOpen, setLockOpen] = useState(false);
    const [forgetOpen, setForgetOpen] = useState(false);
    const [confirmSync, setConfirmSync] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const isLocal = profile === null || profile.mode === 'local';

    useEffect(() => {
        void (async () => {
            const [storedLock, storedBiometric, availability, entryCount, noteCount, scheduleCount] = await Promise.all([
                kvGet<number>(KV.lockMinutes),
                kvGet<boolean>(KV.biometricEnabled),
                biometricAvailable(),
                db.entries.count(),
                db.notes.count(),
                db.schedules.count(),
            ]);

            if (typeof storedLock === 'number') {
                setLockMinutesState(storedLock);
            }

            setBiometricOn(storedBiometric === true);
            setBiometricReady(availability.available && availability.enrolled);
            setCounts({ entries: entryCount, notes: noteCount, schedules: scheduleCount });
        })();
    }, []);

    useEffect(() => {
        if (isLocal) {
            setLatestVersion(null);
            setInstalledVersion(null);
            return;
        }

        void (async () => {
            const info = await CapApp.getInfo();
            const numeric = Number.parseInt(info.build, 10);

            setInstalledVersion(Number.isNaN(numeric) ? null : numeric);
        })();
    }, [isLocal, profile?.serverUrl]);

    useEffect(() => {
        if (isLocal || profile?.serverUrl === null || profile.serverUrl === undefined) {
            return;
        }

        void (async () => {
            const api = new DiarioApi(profile.serverUrl as string);
            const published = await api.publishedApkVersion();

            setLatestVersion(published?.versionCode ?? null);
        })();
    }, [isLocal, profile?.serverUrl]);

    const updateAvailable =
        latestVersion !== null && installedVersion !== null && latestVersion > installedVersion;

    const lastSyncLabel = useMemo(() => {
        if (lastSyncAt === null) {
            return t('native.sync.never');
        }

        return new Date(lastSyncAt).toLocaleString(language);
    }, [lastSyncAt, t, language]);

    const changeLanguage = (next: string): void => {
        void i18n.changeLanguage(next);
        persistLocale(next as Parameters<typeof persistLocale>[0]);
        setLanguage(next);
        setLangOpen(false);
    };

    const toggleBiometric = (next: boolean): void => {
        void (async () => {
            await setBiometricEnabled(next);
            setBiometricOn(next);
        })();
    };

    const chooseLock = (minutes: number): void => {
        void (async () => {
            await setLockMinutes(minutes);
            await kvSet(KV.lockMinutes, minutes);
            setLockMinutesState(minutes);
            setLockOpen(false);
        })();
    };

    const runSync = async (): Promise<void> => {
        setSyncError(null);

        try {
            await syncNow('manual');
        } catch (caught) {
            setSyncError(caught instanceof NetworkError ? t('setup.offline') : t('setup.failed'));
        } finally {
            setConfirmSync(false);
        }
    };

    const forget = async (): Promise<void> => {
        await forgetProfile();
        setForgetOpen(false);
    };

    const openUpdate = async (): Promise<void> => {
        if (profile?.serverUrl === null || profile?.serverUrl === undefined) {
            return;
        }

        const api = new DiarioApi(profile.serverUrl);

        await Browser.open({ url: api.url('/download') });
    };

    const versionLabel = Capacitor.isNativePlatform() ? String(installedVersion ?? '') : '';

    return (
        <div className="pb-10">
            <Card>
                <Row
                    icon={PaletteIcon}
                    label={t('settings.appearance.title')}
                    value={t(`settings.appearance.${appearance === 'dark' ? 'dark' : 'light'}`)}
                    onClick={() => setAppearance(appearance === 'dark' ? 'light' : 'dark')}
                    chevron
                />
                <Row
                    icon={GlobeIcon}
                    label={t('settings.locale.label')}
                    value={LOCALE_NAMES[language as keyof typeof LOCALE_NAMES] ?? language}
                    onClick={() => setLangOpen(true)}
                    chevron
                />
            </Card>

            <Card>
                {isLocal ? (
                    <>
                        <Row icon={ServerIcon} label={t('native.settings.local_mode')} value={t('native.settings.local_mode_value')} />
                        <Row icon={CloudOffIcon} label={t('native.settings.connect_server')} onClick={() => setConnectOpen(true)} chevron />
                    </>
                ) : (
                    <>
                        <Row icon={PersonIcon} label={profile?.email ?? ''} value={undefined} />
                        <Row
                            icon={running ? CloudOffIcon : CloudDoneIcon}
                            label={t('settings.sync.title')}
                            value={lastSyncLabel}
                            onClick={() => setConfirmSync(true)}
                            chevron
                        />
                        <Row icon={LogoutIcon} label={t('native.settings.forget_device')} danger onClick={() => setForgetOpen(true)} chevron />
                    </>
                )}
            </Card>

            <Card>
                <Row
                    icon={FingerprintIcon}
                    label={t('native.settings.require_biometric')}
                    onClick={biometricReady ? () => toggleBiometric(!biometricOn) : undefined}
                >
                    <Toggle checked={biometricOn && biometricReady} onChange={toggleBiometric} />
                </Row>
                <Row
                    icon={LockIcon}
                    label={t('native.settings.lock_after')}
                    value={lockLabel(t, lockMinutes)}
                    onClick={() => setLockOpen(true)}
                    chevron
                />
            </Card>

            <Card>
                <Row
                    icon={DownloadIcon}
                    label={t('native.export.title')}
                    onClick={() => navigate('/settings/export')}
                    chevron
                />
                {updateAvailable && (
                    <Row
                        icon={RefreshIcon}
                        label={t('native.settings.update_available', { version: latestVersion ?? 0 })}
                        onClick={() => void openUpdate()}
                        chevron
                    />
                )}
            </Card>

            <p className="px-2 text-center text-xs text-zinc-400 dark:text-zinc-600">
                {counts.entries} entries · {counts.notes} notes · {counts.schedules} schedules
                {versionLabel !== '' && ` · v${versionLabel}`}
            </p>

            {syncError !== null && (
                <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{syncError}</p>
            )}

            {langOpen && (
                <Sheet title={t('settings.locale.label')} onClose={() => setLangOpen(false)}>
                    <div className="flex flex-col gap-1">
                        {SUPPORTED_LOCALES.map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => changeLanguage(code)}
                                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-900 transition active:bg-zinc-50 dark:text-zinc-100 dark:active:bg-zinc-800"
                            >
                                <span>{LOCALE_NAMES[code]}</span>
                                {code === language && <CheckIcon className="h-4 w-4 text-emerald-500" />}
                            </button>
                        ))}
                    </div>
                </Sheet>
            )}

            {lockOpen && (
                <Sheet title={t('native.settings.lock_after')} onClose={() => setLockOpen(false)}>
                    <div className="flex flex-col gap-1">
                        {LOCK_OPTIONS.map((minutes) => (
                            <button
                                key={minutes}
                                type="button"
                                onClick={() => chooseLock(minutes)}
                                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-900 transition active:bg-zinc-50 dark:text-zinc-100 dark:active:bg-zinc-800"
                            >
                                <span>{lockLabel(t, minutes)}</span>
                                {minutes === lockMinutes && <CheckIcon className="h-4 w-4 text-emerald-500" />}
                            </button>
                        ))}
                    </div>
                </Sheet>
            )}

            {connectOpen && <ConnectSheet onClose={() => setConnectOpen(false)} />}

            {forgetOpen && (
                <Sheet title={t('native.settings.forget_device')} onClose={() => setForgetOpen(false)}>
                    <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">{t('native.settings.forget_confirm')}</p>
                    <div className="flex flex-col gap-2">
                        <Btn variant="danger" onClick={() => void forget()}>
                            {t('native.action.delete')}
                        </Btn>
                        <Btn variant="secondary" onClick={() => setForgetOpen(false)}>
                            {t('common.cancel')}
                        </Btn>
                    </div>
                </Sheet>
            )}

            {confirmSync && (
                <Sheet title={t('settings.sync.title')} onClose={() => setConfirmSync(false)}>
                    <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">{t('native.sync.pull_confirm')}</p>
                    <div className="flex flex-col gap-2">
                        <Btn onClick={() => void runSync()} disabled={running}>
                            {running ? t('native.sync.syncing') : t('native.sync.pull')}
                        </Btn>
                        <Btn variant="secondary" onClick={() => setConfirmSync(false)} disabled={running}>
                            {t('common.cancel')}
                        </Btn>
                    </div>
                </Sheet>
            )}
        </div>
    );
}
