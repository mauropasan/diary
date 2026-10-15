import { useTranslation } from 'react-i18next';
import {
    LOCALE_NAMES,
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from '@/i18n/locales';

type LanguagePickerProps = {
    onSelect: (locale: SupportedLocale) => void;
};

/**
 * Shown when the interface language cannot be detected automatically.
 */
export default function LanguagePicker({ onSelect }: LanguagePickerProps) {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-[#1b1b18] dark:text-[#EDEDEC]">
            <div className="w-full max-w-sm">
                <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                    {t('localePicker.title')}
                </h1>
                <p className="mb-6 text-sm text-zinc-700 dark:text-zinc-300">
                    {t('localePicker.subtitle')}
                </p>

                <div className="flex flex-col gap-2">
                    {SUPPORTED_LOCALES.map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => onSelect(code)}
                            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-left text-sm text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                        >
                            {LOCALE_NAMES[code]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
