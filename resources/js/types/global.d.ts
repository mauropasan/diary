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
            diary: DiarySettings;
            flash: {
                status: string | null;
                recoveryKey: string | null;
            };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
