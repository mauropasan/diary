import { createInertiaApp } from '@inertiajs/react';
import LocaleGate from '@/i18n/LocaleGate';
import { registerBodyBackgroundSync } from '@/lib/background';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

registerBodyBackgroundSync();

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    withApp(app, { ssr }) {
        if (ssr) {
            return app;
        }

        return <LocaleGate>{app}</LocaleGate>;
    },
    progress: {
        color: '#4B5563',
    },
});
