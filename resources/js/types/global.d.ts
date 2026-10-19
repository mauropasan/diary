import type { Auth } from '@/types/auth';
import type { DiarySettings } from '@/types/diary';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            background: string | null;
            backgroundVersion: string | null;
            diary: DiarySettings;
            flash: {
                status: string | null;
                recoveryKey: string | null;
                recoveryCodes: string[] | null;
            };
            notificationCount: number;
            apkAvailable: boolean;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
