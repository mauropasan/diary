import { router } from '@inertiajs/react';
import { background as backgroundImage } from '@/routes/diary';

const IMAGE_CLASS = 'app-background-image';
const IMAGE_PROPERTY = '--app-background-image';

/**
 * The background the server put on `<body>`, or undefined before the first
 * Inertia visit. The body class list is written exclusively by
 * `resources/views/app.blade.php`, so anything shaped like `bg-*` or the
 * image class belongs to the background.
 */
let applied: string | null | undefined;

function currentFromBody(): string | null {
    if (document.body.classList.contains(IMAGE_CLASS)) {
        return 'image';
    }

    for (const name of document.body.classList) {
        if (name.startsWith('bg-')) {
            return name.slice('bg-'.length);
        }
    }

    return null;
}

/**
 * Put the background on `<body>` without a full page load.
 *
 * Inertia visits never re-render the Blade layout, so the body class and the
 * `--app-background-image` property are refreshed from here instead. The
 * value follows the same contract as the server: null for the default, a
 * preset key, or `image` for a custom picture served by the background route.
 */
export function applyBodyBackground(background: string | null): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (applied === undefined) {
        applied = currentFromBody();
    }

    if (applied === background) {
        return;
    }

    for (const name of [...document.body.classList]) {
        if (name === IMAGE_CLASS || name.startsWith('bg-')) {
            document.body.classList.remove(name);
        }
    }

    document.body.style.removeProperty(IMAGE_PROPERTY);

    if (background === 'image') {
        document.body.classList.add(IMAGE_CLASS);
        document.body.style.setProperty(
            IMAGE_PROPERTY,
            `url('${backgroundImage.url()}')`,
        );
    } else if (background !== null) {
        document.body.classList.add(`bg-${background}`);
    }

    applied = background;
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

        applyBodyBackground(props.background);
    });
}
