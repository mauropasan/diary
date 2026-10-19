import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import {
    ensureNotificationPermission,
    syncNativeNotifications,
    type DueNotification,
    type UpcomingNotification,
} from '@/lib/nativeNotifications';
import { upcoming as notificationUpcoming } from '@/routes/diary/notifications';

/**
 * How often the pending moments are re-read. They are already registered with
 * the OS, so this sweep only has to catch what changed while the app was
 * open: a note added, moved or deleted.
 */
const RESYNC_INTERVAL = 60_000;

/**
 * Hand the diary's reminders to Android's scheduler, so a due notification
 * rings through the OS even when the web view is in the background or the app
 * was closed since the last visit.
 *
 * The nav already polls what has come due, so that same list is passed in and
 * only the moments still ahead need a request of their own. Every call is a
 * no-op outside the native shell.
 */
export function useNativeNotifications(due: DueNotification[]): void {
    const [upcoming, setUpcoming] = useState<UpcomingNotification[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
            return;
        }

        let stopped = false;

        async function refresh(): Promise<void> {
            const response = await fetch(notificationUpcoming.url(), {
                headers: { Accept: 'application/json' },
            });

            // An expired session answers with a redirect to the login page, so
            // only trust a JSON body before handing anything to the scheduler.
            if (
                !response.ok ||
                !(response.headers.get('content-type') ?? '').includes('json')
            ) {
                return;
            }

            const payload: unknown = await response.json();

            if (!stopped && Array.isArray(payload)) {
                setUpcoming(payload as UpcomingNotification[]);
            }
        }

        void ensureNotificationPermission();
        void refresh();

        const timer = window.setInterval(() => {
            if (!document.hidden) {
                void refresh();
            }
        }, RESYNC_INTERVAL);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, []);

    // Both sides move on their own poll, so every change re-runs the (fully
    // idempotent) reconciliation against the OS.
    useEffect(() => {
        void syncNativeNotifications(due, upcoming);
    }, [due, upcoming]);
}
