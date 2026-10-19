import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';

/**
 * A reminder whose moment is still ahead: what the Android shell has to hand
 * to the OS scheduler before the page stops polling.
 */
export type UpcomingNotification = {
    id: number;
    title: string | null;
    body: string | null;
    dueAt: string;
};

/** One row of the nav popup list: a notification that has come due. */
export type DueNotification = {
    id: number;
    title: string | null;
    body: string | null;
    readAt: string | null;
};

const RAISED_KEY = 'diary.native.notifications.raised';
const SCHEDULED_KEY = 'diary.native.notifications.scheduled';

/**
 * Only the recent past has to be remembered, so a diary that accumulates
 * years of reminders does not grow the bookkeeping forever.
 */
const MAX_MEMORY = 200;

function readIds(key: string): number[] {
    try {
        const raw = window.localStorage.getItem(key);
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed.filter((id): id is number => typeof id === 'number')
            : [];
    } catch {
        // Unreadable storage only costs a repeated ping.
        return [];
    }
}

function writeIds(key: string, ids: number[]): void {
    try {
        window.localStorage.setItem(
            key,
            JSON.stringify(ids.slice(-MAX_MEMORY)),
        );
    } catch {
        // Full or blocked storage only costs a repeated ping.
    }
}

/**
 * Title and body for the OS notification, or null when there is nothing to
 * say: the OS would drop an empty one anyway.
 */
function describe(notification: {
    title: string | null;
    body: string | null;
}): { title: string; body: string } | null {
    const title = notification.title?.trim() ?? '';
    const body = notification.body?.trim() ?? '';

    if (title === '' && body === '') {
        return null;
    }

    // Without a title Android shows the body as the title, so a body-only
    // notification is promoted instead of being posted as blank.
    return title === '' ? { title: body, body: '' } : { title, body };
}

/**
 * Ask Android 13+ for the right to post notifications. Only asked when it is
 * still undecided: a denial is not re-asked on every page. The in-app popup
 * keeps working either way; this only decides whether the OS may ring as well.
 */
export async function ensureNotificationPermission(): Promise<void> {
    try {
        const { display } = await LocalNotifications.checkPermissions();

        if (display === 'prompt') {
            await LocalNotifications.requestPermissions();
        }
    } catch {
        // Without the bridge or the permission, nothing native happens.
    }
}

/**
 * Bring the OS scheduler in step with the server.
 *
 * The web view stops polling the moment the app goes to the background, so a
 * reminder due while the app is closed would never be seen. Every moment still
 * ahead is therefore registered with the OS, which rings on its own; anything
 * already due and never raised — a fresh install, a cleared cache — is posted
 * straight away.
 *
 * The server notification id doubles as the native notification id, which is
 * what keeps both sides in step across restarts.
 *
 * @param due notifications whose moment has passed, newest first
 * @param upcoming notifications still ahead, oldest moment first
 */
export async function syncNativeNotifications(
    due: DueNotification[],
    upcoming: UpcomingNotification[],
): Promise<void> {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
        return;
    }

    const raised = readIds(RAISED_KEY);
    const scheduled = readIds(SCHEDULED_KEY);

    const dueIds = new Set(due.map((notification) => notification.id));
    const upcomingIds = new Set(
        upcoming.map((notification) => notification.id),
    );

    // Kept: still ahead and already registered. Stale: the note was deleted or
    // its date moved, so the row is gone and the registration has to be taken
    // back out of the OS. Whatever else was scheduled has fired by now and
    // simply drops out of the bookkeeping written below.
    const kept = scheduled.filter((id) => upcomingIds.has(id));
    const stale = scheduled.filter(
        (id) => !dueIds.has(id) && !upcomingIds.has(id),
    );

    const pending = upcoming.filter(
        (notification) =>
            !kept.includes(notification.id) && describe(notification) !== null,
    );
    const missed = due.filter(
        (notification) =>
            notification.readAt === null &&
            !raised.includes(notification.id) &&
            describe(notification) !== null,
    );

    if (stale.length > 0) {
        await LocalNotifications.cancel({
            notifications: stale.map((id) => ({ id })),
        }).catch(() => undefined);
    }

    const payloads: LocalNotificationSchema[] = [
        ...pending.flatMap((notification) => {
            const text = describe(notification);

            return text === null
                ? []
                : [
                      {
                          id: notification.id,
                          ...text,
                          // The app may be in Doze when the moment comes:
                          // Android still delivers it there.
                          schedule: {
                              at: new Date(notification.dueAt),
                              allowWhileIdle: true,
                          },
                      },
                  ];
        }),
        // Already due: no schedule, so the OS posts it right away.
        ...missed.flatMap((notification) => {
            const text = describe(notification);

            return text === null ? [] : [{ id: notification.id, ...text }];
        }),
    ];

    if (payloads.length > 0) {
        await LocalNotifications.schedule({ notifications: payloads }).catch(
            () => undefined,
        );
    }

    writeIds(RAISED_KEY, [...raised, ...payloads.map(({ id }) => id)]);
    writeIds(SCHEDULED_KEY, [...kept, ...pending.map(({ id }) => id)]);
}
