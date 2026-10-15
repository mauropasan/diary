import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { update as settingsUpdate } from '@/routes/diary/settings';

const DEFAULT_SWATCH = 'bg-zinc-100 dark:bg-zinc-800';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const SWATCHES: Record<string, string> = {
    paper: 'bg-[#f6f1e7] dark:bg-[#1c1812]',
    sky: 'bg-[#e8f1f8] dark:bg-[#0e1721]',
    sage: 'bg-[#eaf2ea] dark:bg-[#121a12]',
    peach: 'bg-[#fbeee6] dark:bg-[#1e140e]',
    slate: 'bg-[#eceff3] dark:bg-[#14171c]',
};

type BackgroundPickerProps = {
    background: string | null;
    backgrounds: string[];
};

export default function BackgroundPicker({
    background,
    backgrounds,
}: BackgroundPickerProps): React.JSX.Element {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const isImage = background === 'image';
    const currentKey = isImage ? null : (background ?? 'default');

    function choose(key: string): void {
        setError(null);
        router.put(
            settingsUpdate.url(),
            { background: key === 'default' ? null : key },
            { preserveScroll: true },
        );
    }

    function clear(): void {
        setError(null);
        router.put(
            settingsUpdate.url(),
            { background: null },
            { preserveScroll: true },
        );
    }

    function handleFile(event: React.ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setError(t('settings.backgroundTooLarge'));
            return;
        }

        setError(null);

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                setError(t('settings.backgroundError'));
                return;
            }

            router.put(
                settingsUpdate.url(),
                { background: reader.result },
                { preserveScroll: true },
            );
        };
        reader.onerror = () => setError(t('settings.backgroundError'));
        reader.readAsDataURL(file);
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                {backgrounds.map((key) => {
                    const selected = currentKey === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => choose(key)}
                            aria-pressed={selected}
                            aria-label={t(`settings.backgrounds.${key}`)}
                            title={t(`settings.backgrounds.${key}`)}
                            className={cn(
                                'h-9 w-9 rounded-full border-2 transition',
                                key === 'default'
                                    ? DEFAULT_SWATCH
                                    : (SWATCHES[key] ?? DEFAULT_SWATCH),
                                selected
                                    ? 'border-zinc-900 dark:border-zinc-100'
                                    : 'border-transparent hover:border-zinc-400 dark:hover:border-zinc-500',
                            )}
                        >
                            <span className="sr-only">
                                {t(`settings.backgrounds.${key}`)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    {t('settings.backgroundUpload')}
                </button>
                {isImage && (
                    <button
                        type="button"
                        onClick={clear}
                        className="rounded-md px-2 py-1.5 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                        {t('settings.backgroundClear')}
                    </button>
                )}
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t('settings.backgroundHint')}
                </span>
            </div>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFile}
            />
        </div>
    );
}
