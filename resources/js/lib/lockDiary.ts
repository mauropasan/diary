/**
 * Tell the server to lock the diary by discarding the session encryption key.
 *
 * This uses a plain fetch (not an Inertia visit) so the lock screen overlay can
 * stay mounted instead of navigating away from the entry being edited. The CSRF
 * token is read from the `XSRF-TOKEN` cookie, exactly as Inertia's HTTP client
 * does.
 */
export function lockDiary(url: string): void {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : '';

    void fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': token,
        },
        credentials: 'same-origin',
    });
}
