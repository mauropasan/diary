import { fileURLToPath, URL } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import { defineConfig } from 'vite';

/**
 * The build that fills Capacitor's `webDir` (`www/`): one static bundle with
 * no server behind it, because the Android app boots from the APK and works
 * with or without a connection.
 *
 * It shares the CSS, components and i18n of the Inertia web app — only the
 * entry point differs (`resources/native/index.html` → `native.tsx`).
 * `npm run build` (the Laravel build) is unaffected.
 */
export default defineConfig({
    root: fileURLToPath(new URL('./resources/native', import.meta.url)),
    base: './',
    appType: 'spa',
    plugins: [
        wayfinder({ formVariants: true }),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    build: {
        // Capacitor copies this directory verbatim into the APK (webDir `www`).
        outDir: fileURLToPath(new URL('./www', import.meta.url)),
        emptyOutDir: true,
        target: 'es2022',
    },
});
