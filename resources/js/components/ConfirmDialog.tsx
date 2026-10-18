import { useEffect, useId, useRef } from 'react';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
    confirmDisabled?: boolean;
    /** Extra fields, such as the password a sensitive change asks for. */
    children?: React.ReactNode;
};

/**
 * Accessible confirmation modal used in place of `window.confirm`. It renders a
 * backdrop, focuses the confirm button when opened and can be dismissed with
 * the Escape key or by clicking outside the dialog.
 *
 * The focus and the Escape listener are attached when the dialog opens only:
 * re-focusing on every render would pull the cursor out of any field the dialog
 * carries while it is being typed into.
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    destructive = false,
    confirmDisabled = false,
    children,
}: ConfirmDialogProps): React.JSX.Element | null {
    const titleId = useId();
    const confirmRef = useRef<HTMLButtonElement>(null);
    const onCancelRef = useRef(onCancel);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        if (!open) {
            return;
        }

        confirmRef.current?.focus();

        function closeOnEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onCancelRef.current();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={onCancel}
                className="fixed inset-0 cursor-default bg-black/40 backdrop-blur-sm"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-[#1b1b18] shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-[#EDEDEC]"
            >
                <h2
                    id={titleId}
                    className="text-lg font-semibold tracking-tight"
                >
                    {title}
                </h2>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {message}
                </p>

                {children}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        className={
                            (destructive
                                ? 'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700'
                                : 'rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300') +
                            ' disabled:opacity-50'
                        }
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
