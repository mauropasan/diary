import type {
    PairChallenge,
    PairSuccess,
    PullPayload,
    PushEntryResult,
    PushResult,
    WireAttachment,
} from '@/native/types';

/**
 * Typed client for the diary's JSON API (`/api/v1`).
 *
 * Every sync request carries two credentials: the Sanctum token that proves
 * the account, and the DEK in `X-Diary-Key` so the stateless server can use
 * its own encryption casts for the duration of one request (the key is
 * verified against the stored check value there and never persisted).
 */

/** A request that never reached the server (offline, DNS, timeout, …). */
export class NetworkError extends Error {
    constructor(message = 'The server could not be reached.') {
        super(message);
        this.name = 'NetworkError';
    }
}

/** A server-side failure with optional per-field validation messages. */
export class ApiError extends Error {
    readonly status: number;

    readonly fields: Record<string, string>;

    constructor(
        status: number,
        message: string,
        fields: Record<string, string> = {},
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.fields = fields;
    }
}

/**
 * Normalize what the user typed into a base URL: `example.com:8443` becomes
 * `https://example.com:8443`, trailing slashes are dropped.
 */
export function normalizeServerUrl(input: string): string {
    let value = input.trim();

    if (value === '') {
        throw new ApiError(0, 'Enter the server address.');
    }

    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
    }

    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new ApiError(0, 'That is not a valid server address.');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ApiError(0, 'Only http(s) servers are supported.');
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

const TIMEOUT_MS = 15_000;

export class DiarioApi {
    readonly baseUrl: string;

    private token: string | null = null;

    private dek: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null): void {
        this.token = token;
    }

    setDek(dek: string | null): void {
        this.dek = dek;
    }

    /** Absolute URL for a path (used for links such as the APK download). */
    url(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    private async request(
        path: string,
        init: RequestInit & { json?: unknown } = {},
    ): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const headers = new Headers(init.headers);

        headers.set('Accept', 'application/json');

        if (this.token !== null) {
            headers.set('Authorization', `Bearer ${this.token}`);
        }

        if (this.dek !== null) {
            headers.set('X-Diary-Key', this.dek);
        }

        let body = init.body;

        if (init.json !== undefined) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(init.json);
        }

        try {
            return await fetch(`${this.baseUrl}${path}`, {
                ...init,
                headers,
                body,
                signal: controller.signal,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new NetworkError('The server took too long to answer.');
            }

            throw new NetworkError();
        } finally {
            clearTimeout(timer);
        }
    }

    /** Run a request and decode its JSON, mapping failures to ApiError. */
    private async json<T>(
        path: string,
        init: RequestInit & { json?: unknown } = {},
    ): Promise<{ status: number; data: T }> {
        const response = await this.request(path, init);
        const text = await response.text();
        let data: unknown = null;

        if (text !== '') {
            try {
                data = JSON.parse(text);
            } catch {
                // A proxy may answer with HTML; handled below as a bad response.
            }
        }

        if (!response.ok || data === null || typeof data !== 'object') {
            const payload = (data ?? {}) as {
                message?: string;
                errors?: Record<string, string[]>;
            };

            const fields: Record<string, string> = {};

            for (const [key, messages] of Object.entries(
                payload.errors ?? {},
            )) {
                fields[key] = messages[0] ?? '';
            }

            throw new ApiError(
                response.status,
                payload.message ??
                    (response.status === 0
                        ? 'The server could not be reached.'
                        : `Request failed (${response.status}).`),
                fields,
            );
        }

        return { status: response.status, data: data as T };
    }

    /* ---------------------------- pairing ---------------------------- */

    async login(
        email: string,
        password: string,
    ): Promise<PairSuccess | PairChallenge> {
        const { data } = await this.json<PairSuccess | PairChallenge>(
            '/api/v1/auth/login',
            { method: 'POST', json: { email, password } },
        );

        const challenge = data as Partial<PairChallenge>;

        // A two-factor account stops at the password: 200 with a parked
        // challenge and no token, instead of the pairing payload.
        if (
            challenge.two_factor_required === true &&
            typeof challenge.challenge_id === 'string'
        ) {
            return data as PairChallenge;
        }

        return data;
    }

    /**
     * Finish a two-factor attempt. An authenticator code goes to the
     * `two-factor` endpoint; a one-time recovery code is deliberately sent to
     * `recover`, where consuming it is checked separately (and a mistyped
     * code can never burn one there).
     */
    async twoFactor(
        challengeId: string,
        code: string,
        useRecovery = false,
    ): Promise<PairSuccess> {
        const { data } = await this.json<PairSuccess>(
            useRecovery ? '/api/v1/auth/recover' : '/api/v1/auth/two-factor',
            {
                method: 'POST',
                json: useRecovery
                    ? { challenge_id: challengeId, recovery_code: code }
                    : { challenge_id: challengeId, code },
            },
        );

        return data;
    }

    /**
     * Sign in with the one-time recovery key issued at registration — the
     * way back into a paired account when the password is gone.
     */
    async recover(
        email: string,
        recoveryKey: string,
        code?: string,
    ): Promise<PairSuccess> {
        const { data } = await this.json<PairSuccess>('/api/v1/auth/recover-key', {
            method: 'POST',
            json: { email, recovery_key: recoveryKey, code },
        });

        return data;
    }

    async register(input: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
    }): Promise<PairSuccess> {
        const { data } = await this.json<PairSuccess>('/api/v1/auth/register', {
            method: 'POST',
            json: input,
        });

        return data;
    }

    /** Probe server + token; returns the account. */
    async me(): Promise<{
        user: {
            id: number;
            email: string;
            name: string;
            two_factor_enabled: boolean;
        };
    }> {
        const { data } = await this.json<{
            user: {
                id: number;
                email: string;
                name: string;
                two_factor_enabled: boolean;
            };
        }>('/api/v1/auth/me');

        return data;
    }

    async logout(): Promise<void> {
        await this.request('/api/v1/auth/logout', { method: 'POST' });
    }

    /* ----------------------------- sync ------------------------------ */

    async pull(cursor: number, limit = 300): Promise<PullPayload> {
        const { data } = await this.json<PullPayload>(
            `/api/v1/sync?cursor=${cursor}&limit=${limit}`,
        );

        return data;
    }

    async push(payload: {
        entries: unknown[];
        notes: unknown[];
        schedules: unknown[];
    }): Promise<PushResult<PushEntryResult>> {
        const { data } = await this.json<PushResult<PushEntryResult>>(
            '/api/v1/sync',
            { method: 'POST', json: payload },
        );

        return data;
    }

    /* -------------------------- attachments -------------------------- */

    async uploadAttachment(
        date: string,
        file: Blob,
        originalName: string,
    ): Promise<WireAttachment> {
        const form = new FormData();

        form.append('attachment', file, originalName);

        const { data } = await this.json<{ attachment: WireAttachment }>(
            `/api/v1/entries/${date}/attachments`,
            { method: 'POST', body: form },
        );

        return data.attachment;
    }

    /** Download an attachment's decrypted bytes (the DEK header is attached). */
    async downloadAttachment(id: number): Promise<Blob> {
        const response = await this.request(`/api/v1/attachments/${id}`);

        if (!response.ok) {
            throw new ApiError(response.status, 'The file could not be downloaded.');
        }

        return response.blob();
    }

    /* --------------------------- updates ----------------------------- */

    /**
     * The version published on the *connected* server (`scripts/apk.sh`
     * writes it), or null when no build is published / not paired.
     */
    async publishedApkVersion(): Promise<{
        versionCode: number;
        versionName?: string;
    } | null> {
        try {
            const response = await this.request('/download/version');

            if (!response.ok) {
                return null;
            }

            const payload: unknown = await response.json();

            if (
                typeof payload === 'object' &&
                payload !== null &&
                typeof (payload as { versionCode?: unknown }).versionCode ===
                    'number'
            ) {
                return payload as { versionCode: number; versionName?: string };
            }

            return null;
        } catch {
            return null;
        }
    }
}
