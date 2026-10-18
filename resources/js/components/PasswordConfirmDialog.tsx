import { useEffect, useId, useRef } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

type PasswordConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    passwordLabel: string;
    password: string;
    onPasswordChange: (value: string) => void;
    error?: string;
    processing?: boolean;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Confirmation modal that asks the acting account for its password before a
 * sensitive change. The dialog is meant to stay open while the password is
 * wrong, so the error is shown next to the field and the change can be retried
 * without reopening it.
 */
export default function PasswordConfirmDialog({
    open,
    title,
    message,
    passwordLabel,
    password,
    onPasswordChange,
    error,
    processing = false,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: PasswordConfirmDialogProps): React.JSX.Element | null {
    const fieldId = useId();
    const fieldRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        fieldRef.current?.focus();
    }, [open]);

    return (
        <ConfirmDialog
            open={open}
            destructive
            title={title}
            message={message}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            confirmDisabled={processing}
            onConfirm={onConfirm}
            onCancel={onCancel}
        >
            <div className="mt-4 flex flex-col gap-1">
                <label
                    htmlFor={fieldId}
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                    {passwordLabel}
                </label>
                <input
                    ref={fieldRef}
                    id={fieldId}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onConfirm();
                        }
                    }}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
                />
                {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}
            </div>
        </ConfirmDialog>
    );
}
