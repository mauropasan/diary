import { useCallback, useState, useSyncExternalStore } from 'react';
import {
    getSessionState,
    subscribeSession,
    type SessionState,
} from '@/native/session';
import { getSyncState, subscribeSync, type SyncState } from '@/native/sync';

/** The current session phase/profile, re-rendering on every change. */
export function useSession(): SessionState {
    return useSyncExternalStore(subscribeSession, getSessionState);
}

/** Sync engine status (running/offline/last sync), re-rendering on change. */
export function useSyncState(): SyncState {
    return useSyncExternalStore(subscribeSync, getSyncState);
}

/**
 * A stable async click handler that surfaces its own pending state — the
 * pattern every form in the native app needs without Inertia's useForm.
 */
export function useAsyncAction<Args extends unknown[]>(
    action: (...args: Args) => Promise<void>,
): {
    run: (...args: Args) => Promise<void>;
    pending: boolean;
    error: string | null;
    clearError: () => void;
} {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(
        async (...args: Args) => {
            setPending(true);
            setError(null);

            try {
                await action(...args);
            } catch (caught) {
                setError(
                    caught instanceof Error ? caught.message : String(caught),
                );
            } finally {
                setPending(false);
            }
        },
        [action],
    );

    const clearError = useCallback(() => setError(null), []);

    return { run, pending, error, clearError };
}
