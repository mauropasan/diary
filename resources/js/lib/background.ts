import { router } from '@inertiajs/react';
import { background as backgroundImage } from '@/routes/diary';

const IMAGE_CLASS = 'app-background-image';
const IMAGE_PROPERTY = '--app-background-image';

type AppliedBackground = {
    choice: string | null;
    version: string | null;
};

/**
 * The background the server put on `<body>`, or undefined before the first
 * Inertia visit. The body class list is written exclusively by
 * `resources/views/app.blade.php`, so anything shaped like `bg-*` or the
 * image class belongs to the background.
 */
let applied: AppliedBackground | undefined;

function currentFromBody(): AppliedBackground {
    if (document.body.classList.contains(IMAGE_CLASS)) {
        const value = document.body.style.getPropertyValue(IMAGE_PROPERTY);
        const match = /[?&]v=([^&'")]+)/.exec(value);

        return {
            choice: 'image',
            version: match === null ? null : decodeURIComponent(match[1]),
        };
    }

    for (const name of document.body.classList) {
        if (name.startsWith('bg-')) {
            return {
                choice: name.slice('bg-'.length),
                version: null,
            };
        }
    }

    return { choice: null, version: null };
}

function imageUrl(version: string | null): string {
    const base =
        (typeof window !== 'undefined' ? window.location.origin : '') +
        backgroundImage.url();

    if (version === null) {
        return base;
    }

    return `${base}?v=${encodeURIComponent(version)}`;
}

/**
 * Put the background on `<body>` without a full page load.
 *
 * Inertia visits never re-render the Blade layout, so the body class and the
 * `--app-background-image` property are refreshed from here instead. The
 * value follows the same contract as the server: null for the default, a
 * preset key, or `image` for a custom picture served by the background route.
 *
 * The version (a timestamp from the server) is what tells an unchanged
 * `image` marker apart from a freshly uploaded picture: the image route has a
 * stable URL, so replacing the picture only shows up once the query string
 * changes and the browser fetches it again.
 */
export function applyBodyBackground(
    background: string | null,
    version: string | null = null,
): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (applied === undefined) {
        applied = currentFromBody();
    }

    const key: AppliedBackground =
        background !== null && background !== 'image'
            ? { choice: background, version: null }
            : { choice: background, version };

    if (applied.choice === key.choice && applied.version === key.version) {
        return;
    }

    for (const name of Array.from(document.body.classList)) {
        if (name === IMAGE_CLASS || name.startsWith('bg-')) {
            document.body.classList.remove(name);
        }
    }

    document.body.style.removeProperty(IMAGE_PROPERTY);

    if (key.choice === 'image') {
        document.body.classList.add(IMAGE_CLASS);
        document.body.style.setProperty(
            IMAGE_PROPERTY,
            `url('${imageUrl(key.version)}')`,
        );
    } else if (key.choice !== null) {
        document.body.classList.add(`bg-${key.choice}`);
    }

    applied = key;
}

/**
 * Keep the background in sync after every Inertia visit: login, unlock,
 * settings changes and navigation all arrive as `success` events, while the
 * very first render of a page load is handled by the Blade layout.
 */
export function registerBodyBackgroundSync(): void {
    if (typeof window === 'undefined') {
        return;
    }

    router.on('success', (event) => {
        const { props } = event.detail.page;

        // A partial reload (`only: [...]`) drops the shared props, so an absent
        // value means "nothing to say about the background" rather than "the
        // background was cleared".
        if (!('background' in props)) {
            return;
        }

        applyBodyBackground(props.background, props.backgroundVersion ?? null);
    });
}
