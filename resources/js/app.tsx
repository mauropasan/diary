import { createInertiaApp } from '@inertiajs/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import UpdateBanner from '@/components/UpdateBanner';
import LocaleGate from '@/i18n/LocaleGate';
import { registerBodyBackgroundSync } from '@/lib/background';
import { registerNativeStatusBar } from '@/lib/statusBar';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

registerBodyBackgroundSync();
registerNativeStatusBar();

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    withApp(app, { ssr }) {
        if (ssr) {
            return app;
        }

        return (
            <LocaleGate>
                {/* Outside the boundary: an update notice must never take the
                    diary itself down with it. */}
                <UpdateBanner />
                <ErrorBoundary>{app}</ErrorBoundary>
            </LocaleGate>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
