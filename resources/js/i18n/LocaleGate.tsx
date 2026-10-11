import { useEffect, useState, type ReactNode } from 'react';
import LanguagePicker from '@/components/LanguagePicker';
import i18n, { detectLocale, persistLocale } from '@/i18n';
import type { SupportedLocale } from '@/i18n/locales';

type LocaleGateProps = {
    children: ReactNode;
};

/**
 * Resolves the interface language before rendering the app.
 *
 * When neither a saved preference nor the browser's preferred languages point
 * at a supported language, the user is asked to pick one. English is the final
 * fallback and is always offered in the picker.
 */
export default function LocaleGate({ children }: LocaleGateProps) {
    const [locale, setLocale] = useState<SupportedLocale | null>(() =>
        detectLocale(),
    );

    useEffect(() => {
        if (locale !== null && i18n.language !== locale) {
            void i18n.changeLanguage(locale);
        }
    }, [locale]);

    if (locale === null) {
        return (
            <LanguagePicker
                onSelect={(choice) => {
                    persistLocale(choice);
                    setLocale(choice);
                }}
            />
        );
    }

    return <>{children}</>;
}
