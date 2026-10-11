/**
 * Languages the diary interface can be shown in.
 *
 * Keep this list in sync with `config('diary.locales')` on the server, which
 * drives `SetLocale` and the `locales` shared prop.
 */

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'it'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    it: 'Italiano',
};

export function isSupportedLocale(value: string): value is SupportedLocale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
