import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { createRoot } from 'react-dom/client';
import LocaleGate from '@/i18n/LocaleGate';
import '@/i18n';
import { registerNativeStatusBar } from '@/lib/statusBar';
import NativeApp from '@/native/App';
import { bootSession } from '@/native/session';
import { initSync, registerSyncTriggers } from '@/native/sync';
import '../css/app.css';

/**
 * Entry point of the offline-first Android app.
 *
 * Everything here runs without a server: the session boots from the local
 * profile, the UI renders from IndexedDB, and the synchroniser (registered
 * but idle until something is configured) takes over when a server exists.
 */

registerNativeStatusBar();

const root = document.getElementById('diary-app');

if (root !== null) {
    createRoot(root).render(
        <LocaleGate>
            <NativeApp />
        </LocaleGate>,
    );
}

void (async () => {
    await bootSession();
    await initSync();
    await registerSyncTriggers();

    if (Capacitor.isNativePlatform()) {
        const { SplashScreen } = await import('@capacitor/splash-screen');

        // The hardware back button: back through the screens visited in this
        // session; at the first screen, minimize instead of exiting, the
        // Android convention for apps that keep working in the background.
        void App.addListener('backButton', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                void App.minimizeApp().catch(() => undefined);
            }
        });

        await SplashScreen.hide().catch(() => undefined);
    }
})();
