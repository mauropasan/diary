import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

/**
 * Whether the app is running inside a native shell (the Capacitor Android
 * build) instead of a browser. It starts as `false` so the server-rendered
 * markup matches the first client render, then settles once mounted — the
 * native bridge is only available on the client.
 */
export function useIsNativeApp(): boolean {
    const [isNativeApp, setIsNativeApp] = useState(false);

    useEffect(() => {
        setIsNativeApp(Capacitor.isNativePlatform());
    }, []);

    return isNativeApp;
}
