import { useTranslation } from 'react-i18next';
import { useState, type KeyboardEvent } from 'react';

type TagInputProps = {
    value: string[];
    onChange: (tags: string[]) => void;
};

export default function TagInput({ value, onChange }: TagInputProps) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState('');

    function commit(raw: string): void {
        const name = raw.trim();

        if (name === '') {
            setDraft('');

            return;
        }

        const exists = value.some(
            (tag) => tag.toLowerCase() === name.toLowerCase(),
        );

        if (!exists) {
            onChange([...value, name]);
        }

        setDraft('');
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit(draft);

            return;
        }

        if (event.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    }

    function remove(tag: string): void {
        onChange(value.filter((current) => current !== tag));
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {value.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => remove(tag)}
                        aria-label={t('tags.remove', { tag })}
                        className="text-zinc-600 transition hover:text-zinc-700 dark:hover:text-zinc-100"
                    >
                        ×
                    </button>
                </span>
            ))}

            <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => commit(draft)}
                placeholder={t('tags.placeholder')}
                className="min-w-[8rem] flex-1 border-none bg-transparent px-0 py-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-400"
            />
        </div>
    );
}
