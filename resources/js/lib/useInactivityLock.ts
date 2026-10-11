import { useEffect, useRef, useState } from 'react';

type UseInactivityLockOptions = {
    lockAfterMinutes: number;
    onWarning?: () => void;
    onLock: () => void;
    enabled?: boolean;
};

const WARNING_SECONDS = 5;

const ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'wheel',
    'touchstart',
    'pointerdown',
] as const;

/**
 * Counts down the diary inactivity window and reports the remaining seconds.
 *
 * The countdown is reset on genuine user activity (pointer, keyboard, scroll)
 * only. Background requests such as the debounced autosave or the pre-lock
 * flush deliberately do NOT reset it, so the diary still locks even though the
 * server refreshed its own deadline while saving. A few seconds before expiry
 * the `onWarning` callback fires (used to flush any pending autosave) and, once
 * the window is done, `onLock` fires so the client can lock the session.
 */
export function useInactivityLock({
    lockAfterMinutes,
    onWarning,
    onLock,
    enabled = true,
}: UseInactivityLockOptions): number {
    const totalSeconds = lockAfterMinutes * 60;

    const [remaining, setRemaining] = useState(totalSeconds);

    const deadlineRef = useRef(0);
    const lastActivityRef = useRef(0);
    const warnedRef = useRef(false);
    const lockedRef = useRef(false);
    const onWarningRef = useRef(onWarning);
    const onLockRef = useRef(onLock);

    onWarningRef.current = onWarning;
    onLockRef.current = onLock;

    useEffect(() => {
        if (!enabled || totalSeconds <= 0) {
            return;
        }

        const reset = (): void => {
            deadlineRef.current = Date.now() + totalSeconds * 1000;
            warnedRef.current = false;
            lockedRef.current = false;
            setRemaining(totalSeconds);
        };

        reset();

        const handleActivity = (): void => {
            const now = Date.now();

            if (now - lastActivityRef.current < 1000) {
                return;
            }

            lastActivityRef.current = now;
            reset();
        };

        for (const event of ACTIVITY_EVENTS) {
            document.addEventListener(event, handleActivity, { passive: true });
        }

        const interval = window.setInterval(() => {
            const secondsLeft = Math.max(
                0,
                Math.round((deadlineRef.current - Date.now()) / 1000),
            );

            setRemaining(secondsLeft);

            if (
                !warnedRef.current &&
                secondsLeft <= WARNING_SECONDS &&
                secondsLeft > 0
            ) {
                warnedRef.current = true;
                onWarningRef.current?.();
            }

            if (secondsLeft <= 0 && !lockedRef.current) {
                lockedRef.current = true;
                onLockRef.current();
            }
        }, 1000);

        return () => {
            for (const event of ACTIVITY_EVENTS) {
                document.removeEventListener(event, handleActivity);
            }

            window.clearInterval(interval);
        };
    }, [enabled, totalSeconds]);

    return remaining;
}
