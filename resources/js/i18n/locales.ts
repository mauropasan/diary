/**
 * Languages the diary interface can be shown in.
 *
 * Keep this list in sync with `config('diary.locales')` on the server, which
 * drives `SetLocale` and the `locales` shared prop.
 */

export const SUPPORTED_LOCALES = [
    'ca',
    'de',
    'en',
    'es',
    'fr',
    'it',
    'pt',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    ca: 'Català',
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
    pt: 'Português',
};

export function isSupportedLocale(value: string): value is SupportedLocale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
