import type { TFunction } from 'i18next';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation } from 'react-i18next';

type ErrorBoundaryProps = {
    t: TFunction;
    children: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

class ErrorBoundaryInner extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    public state: ErrorBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('Unhandled UI error', error, info.componentStack);
    }

    public render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { t } = this.props;

        return (
            <div
                role="alert"
                className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
            >
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t('error.boundary')}
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {t('error.reload')}
                </button>
            </div>
        );
    }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryInner);

export default ErrorBoundary;
