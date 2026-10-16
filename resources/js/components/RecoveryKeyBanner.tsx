import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type RecoveryKeyBannerProps = {
    title: string;
    intro: string;
    code: string;
    onClose: () => void;
    className?: string;
};

export default function RecoveryKeyBanner({
    title,
    intro,
    code,
    onClose,
    className,
}: RecoveryKeyBannerProps) {
    const { t } = useTranslation();

    return (
        <div
            className={cn(
                'mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
                className,
            )}
        >
            <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        {intro}
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
            <code className="block rounded bg-amber-100 px-3 py-2 font-mono text-xs break-all dark:bg-amber-900/50">
                {code}
            </code>
        </div>
    );
}
