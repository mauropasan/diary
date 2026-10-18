import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type RecoveryCodesBannerProps = {
    codes: string[];
    onClose: () => void;
    className?: string;
};

export default function RecoveryCodesBanner({
    codes,
    onClose,
    className,
}: RecoveryCodesBannerProps) {
    const { t } = useTranslation();

    return (
        <div
            className={cn(
                'mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
                className,
            )}
        >
            <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                    <p className="font-medium">{t('twoFactor.codesTitle')}</p>
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        {t('twoFactor.codesIntro')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className="shrink-0 leading-none text-amber-600 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                >
                    ×
                </button>
            </div>

            <ul className="mt-2 grid grid-cols-2 gap-1">
                {codes.map((code) => (
                    <li key={code}>
                        <code className="block rounded bg-amber-100 px-2 py-1 font-mono text-xs dark:bg-amber-900/60">
                            {code}
                        </code>
                    </li>
                ))}
            </ul>
        </div>
    );
}
