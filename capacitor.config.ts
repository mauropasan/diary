import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'es.diario.app',
    appName: 'Diario',
    webDir: 'www',
    server: {
        // The diary is a server-rendered Laravel + Inertia app, so the Android
        // shell loads the hosted application instead of bundled assets.
        // Point this at the machine serving the app (dev over LAN, or a real
        // HTTPS address for production).
        url: 'http://192.168.1.4:8000',
        cleartext: true,
        androidScheme: 'https',
    },
};

export default config;
