import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { loadEnv } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

/**
 * Resolve the host used for the dev server (and HMR) from APP_URL so other
 * devices on the network can load assets. Set APP_URL to your LAN address,
 * e.g. APP_URL=http://192.168.1.4:8000.
 */
function devServerHost(appUrl: string | undefined): string {
    try {
        return new URL(appUrl ?? '').hostname || 'localhost';
    } catch {
        return 'localhost';
    }
}

/**
 * Page origins allowed to load development assets.
 *
 * Vite serves `<script type="module">`, which browsers fetch in CORS mode, so
 * the *page* origin (APP_URL, e.g. http://192.168.1.4:8000, also used by the
 * Capacitor shell) has to be answered with `Access-Control-Allow-Origin`
 * otherwise React/Inertia never boots and every form silently falls back to a
 * plain HTML submit. Keep Vite's defaults (loopback and *.test) and add every
 * address of the local network.
 */
const localNetworkOrigin =
    /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;

/**
 * Normalized origin (scheme://host[:port]) of APP_URL, or an empty string when
 * it cannot be parsed.
 */
function appUrlOrigin(appUrl: string | undefined): string {
    try {
        return new URL(appUrl ?? '').origin;
    } catch {
        return '';
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = devServerHost(env.APP_URL);
    const appOrigin = appUrlOrigin(env.APP_URL);

    return {
        plugins: lazyPlugins(() => [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
                fonts: [
                    bunny('Instrument Sans', {
                        weights: [400, 500, 600],
                    }),
                ],
            }),
            inertia(),
            react(),
            babel({
                presets: [reactCompilerPreset()],
            }),
            tailwindcss(),
            wayfinder({
                formVariants: true,
            }),
        ]),
        server: {
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            cors: {
                origin: [
                    ...(appOrigin ? [appOrigin] : []),
                    localNetworkOrigin,
                    // Valet / Herd    (SCHEME://*.test:PORT)
                    /^https?:\/\/.*\.test(:\d+)?$/,
                ],
            },
            hmr: {
                host,
            },
            watch: {
                ignored: [
                    '**/.agents/**',
                    '**/.claude/**',
                    '**/.cursor/**',
                    '**/.junie/**',
                    '**/vendor/**',
                ],
            },
        },
        lint: {
            ignorePatterns: [
                'vendor/**',
                'node_modules/**',
                'public/**',
                'bootstrap/ssr/**',
                'tailwind.config.js',
                'resources/js/actions/**',
                'resources/js/routes/**',
                'resources/js/wayfinder/**',
            ],
            options: {
                denyWarnings: true,
                typeAware: true,
            },
        },
        fmt: {
            printWidth: 80,
            tabWidth: 4,
            singleQuote: true,
            semi: true,
            singleAttributePerLine: false,
            htmlWhitespaceSensitivity: 'css',
            ignorePatterns: ['.github/**', 'composer.json'],
            sortTailwindcss: {
                functions: ['clsx', 'cn', 'cva'],
                stylesheet: 'resources/css/app.css',
            },
        },
    };
});
