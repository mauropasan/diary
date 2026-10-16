import { useTranslation } from 'react-i18next';

type FlashBannerProps = {
    message: string;
    onClose: () => void;
};

export default function FlashBanner({ message, onClose }: FlashBannerProps) {
    const { t } = useTranslation();

    return (
        <div
            role="status"
            className="mb-6 flex w-full items-start justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="shrink-0 leading-none text-emerald-600 transition hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100"
            >
                ×
            </button>
        </div>
    );
}
