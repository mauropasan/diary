import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import it from '@/i18n/locales/it.json';
import pt from '@/i18n/locales/pt.json';
import ca from '@/i18n/locales/ca.json';
import { isSupportedLocale, type SupportedLocale } from '@/i18n/locales';

const COOKIE_NAME = 'lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const resources = {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    it: { translation: it },
    ca: { translation: ca },
} as const;

/**
 * Read the language chosen by the user, if any.
 */
export function readPreference(): SupportedLocale | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
    );
    const value = match ? decodeURIComponent(match[1]) : null;

    return value && isSupportedLocale(value) ? value : null;
}

/**
 * Resolve the initial language: saved choice first, then the browser's
 * preferred languages. Returns `null` when nothing supported is detected so
 * the caller can ask the user to pick one.
 */
export function detectLocale(): SupportedLocale | null {
    const saved = readPreference();

    if (saved) {
        return saved;
    }

    if (typeof navigator === 'undefined') {
        return null;
    }

    const languages = navigator.languages ?? [navigator.language];

    for (const raw of languages) {
        const base = raw.toLowerCase().split('-')[0];

        if (isSupportedLocale(base)) {
            return base;
        }
    }

    return null;
}

/**
 * Persist a language choice so the server can pick it up on the next request.
 */
export function persistLocale(locale: SupportedLocale): void {
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

void i18n.use(initReactI18next).init({
    resources,
    lng: detectLocale() ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
});

export default i18n;
