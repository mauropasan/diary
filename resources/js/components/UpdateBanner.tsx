import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    apk as downloadApk,
    version as downloadVersion,
} from '@/routes/download';

/**
 * How often the published build is re-read. Coming back to the foreground is
 * re-checked as well, since that is when someone is most likely to install,
 * and the whole check costs a single small JSON request.
 */
const REMIND_INTERVAL = 6 * 60 * 60 * 1000;

const DISMISSED_KEY = 'diary.native.update.dismissed';

type PublishedVersion = {
    versionCode: number;
    versionName?: string;
};

/**
 * The build the user waved away, so only a *newer* one asks again.
 */
function readDismissedVersionCode(): number | null {
    try {
        const dismissed = Number(window.localStorage.getItem(DISMISSED_KEY));

        return Number.isFinite(dismissed) && dismissed > 0 ? dismissed : null;
    } catch {
        return null;
    }
}

/**
 * The version published by the last `npm run apk:release`, or null when no
 * build has been published yet.
 */
async function fetchPublishedVersion(): Promise<PublishedVersion | null> {
    try {
        const response = await fetch(downloadVersion.url(), {
            headers: { Accept: 'application/json' },
        });

        // The route is public, but a proxy may still answer with HTML.
        if (
            !response.ok ||
            !(response.headers.get('content-type') ?? '').includes('json')
        ) {
            return null;
        }

        const payload: unknown = await response.json();

        if (
            typeof payload !== 'object' ||
            payload === null ||
            typeof (payload as PublishedVersion).versionCode !== 'number'
        ) {
            return null;
        }

        return payload as PublishedVersion;
    } catch {
        return null;
    }
}

/**
 * Offer the newest APK while the app is running one.
 *
 * The shell only wraps the hosted diary, so the web code itself is always up
 * to date while the native part is not: `scripts/apk.sh` stamps every build
 * with a versionCode, `App.getInfo()` reads back the one installed, and the
 * banner shows whenever the published build is ahead. The install link stays
 * public, so it works before signing in too.
 *
 * Renders nothing outside the native shell: a browser cannot install an APK.
 */
export default function UpdateBanner(): React.JSX.Element | null {
    const { t } = useTranslation();
    const [available, setAvailable] = useState<PublishedVersion | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
            return;
        }

        let stopped = false;

        async function check(): Promise<void> {
            let installedBuild: number;

            try {
                // `build` is the versionCode Android compares on install.
                installedBuild = Number((await CapacitorApp.getInfo()).build);
            } catch {
                return;
            }

            const published = await fetchPublishedVersion();

            if (
                stopped ||
                published === null ||
                !Number.isFinite(installedBuild)
            ) {
                return;
            }

            if (
                published.versionCode > installedBuild &&
                published.versionCode !== readDismissedVersionCode()
            ) {
                setAvailable(published);
            }
        }

        void check();

        const listener = CapacitorApp.addListener(
            'appStateChange',
            ({ isActive }: { isActive: boolean }) => {
                if (isActive) {
                    void check();
                }
            },
        );
        const timer = window.setInterval(() => void check(), REMIND_INTERVAL);

        return () => {
            stopped = true;
            window.clearInterval(timer);
            void listener.then((handle) => handle.remove());
        };
    }, []);

    if (available === null) {
        return null;
    }

    const versionCode = available.versionCode;

    function dismiss(): void {
        try {
            window.localStorage.setItem(DISMISSED_KEY, String(versionCode));
        } catch {
            // Nothing remembered: the banner simply comes back next time.
        }

        setAvailable(null);
    }

    async function install(): Promise<void> {
        const url = new URL(downloadApk.url(), window.location.origin);

        // A web view cannot download files itself, so the APK is handed to the
        // system browser, which downloads it and offers the installation.
        try {
            await Browser.open({ url: url.toString() });
        } catch {
            window.location.assign(url.toString());
        }
    }

    return (
        <div
            role="status"
            className="fixed inset-x-0 z-50 flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
            style={{
                // Clear of the status bar the shell draws over the page.
                top: 'max(env(safe-area-inset-top), var(--app-status-bar-height, 0px))',
            }}
        >
            <p>
                {t('update.message', {
                    version:
                        available.versionName ?? String(available.versionCode),
                })}
            </p>
            <div className="flex shrink-0 items-center gap-3">
                <button
                    type="button"
                    onClick={() => void install()}
                    className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1 font-medium transition hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900 dark:hover:bg-amber-800"
                >
                    {t('update.install')}
                </button>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t('common.close')}
                    className="leading-none text-amber-600 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
