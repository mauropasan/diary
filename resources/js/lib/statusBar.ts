import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Keep the status bar icons readable over the diary's own background: the
 * shell draws behind the bar, so the icons follow the app's light/dark toggle
 * instead of the device one.
 */
function syncStatusBarStyle(): void {
    const dark = document.documentElement.classList.contains('dark');

    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(
        () => undefined,
    );
}

/**
 * Publish the status bar height as `--app-status-bar-height`, the value
 * `resources/css/app.css` uses to keep the page clear of the bar. The WebView
 * can report no `env(safe-area-inset-top)` of its own, so the bridge measures
 * it instead.
 */
async function publishStatusBarInset(): Promise<void> {
    try {
        const { height } = await StatusBar.getInfo();

        if (height > 0) {
            document.documentElement.style.setProperty(
                '--app-status-bar-height',
                `${height}px`,
            );
        }
    } catch {
        // Nothing to measure when the bridge is missing.
    }
}

/**
 * Make the Android shell immersive: the status bar overlays the WebView so the
 * page background reaches the top edge, and its height is published to CSS
 * while the icons track the app theme. Every call is a no-op outside the
 * native shell.
 */
export function registerNativeStatusBar(): void {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
        return;
    }

    // Android 15+ is always edge to edge; below that this is what makes the
    // WebView fill the area under the bar and the bar itself transparent.
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);

    syncStatusBarStyle();
    void publishStatusBarInset();

    new MutationObserver(syncStatusBarStyle).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
    });
}
