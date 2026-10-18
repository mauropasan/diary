<?php

return [

    'login' => [
        'failed' => 'Las credenciales no coinciden con nuestros registros.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'unlock' => [
        'wrong-password' => 'La contraseña no es correcta.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'recovery' => [
        'no-account' => 'No hay ninguna cuenta con clave de recuperación para ese correo.',
        'invalid-key' => 'La clave de recuperación no es válida o los datos están dañados.',
        'restored' => 'Acceso restaurado y contraseña actualizada.',
    ],

    'register' => [
        'ready' => 'Tu diario está listo.',
    ],

    'password' => [
        'updated' => 'Contraseña actualizada. La clave del diario se ha vuelto a proteger con la nueva contraseña.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'two_factor' => [
        'ready' => 'Escanea el código QR y confirma un código para activar la autenticación de dos factores.',
        'enabled' => 'La autenticación de dos factores está activada.',
        'disabled' => 'La autenticación de dos factores está desactivada.',
        'codes-regenerated' => 'Se han generado códigos de recuperación nuevos. Los anteriores ya no funcionan.',
        'invalid-code' => 'Ese código no es válido. Comprueba tu aplicación de autenticación e inténtalo de nuevo.',
        'password-required' => 'Escribe tu contraseña para desactivar la autenticación de dos factores.',
        'invalid-password' => 'Esa contraseña no es correcta, así que la autenticación de dos factores sigue activada.',
    ],

    'admin' => [
        'created' => 'Cuenta de :name creada. Entrega la contraseña y la clave de recuperación al nuevo usuario.',
        'self-delete' => 'No puedes eliminar tu propia cuenta.',
        'deleted' => 'La cuenta de :name ha sido eliminada.',
        'email-updated' => 'El correo electrónico de :name ha sido actualizado.',
        'two-factor-disabled' => 'La autenticación de dos factores se ha desactivado para :name y se han cerrado todas sus sesiones.',
    ],

    'moods' => [
        1 => 'Muy mal',
        2 => 'Mal',
        3 => 'Regular',
        4 => 'Bien',
        5 => 'Muy bien',
    ],

    'export' => [
        'title' => 'Diario',
        'mood' => 'Ánimo: :mood',
        'tags' => 'Etiquetas: :tags',
    ],

    'notes' => [
        'empty' => 'Escribe un título o algo de texto.',
        'dated-kind-needs-date' => 'Un recordatorio o un evento necesita un día.',
    ],

    'settings' => [
        'background-updated' => 'Fondo actualizado.',
        'email-updated' => 'Correo electrónico actualizado.',
        'notifications-updated' => 'Notificaciones por correo actualizadas.',
        'reminder-updated' => 'Programación de recordatorios actualizada.',
        'reminder-days-invalid' => 'Elige con cuántos días de antelación avisar, entre 0 y :max.',
        'reminder-times-invalid' => 'Elige entre 1 y :max avisos al día.',
        'reminder-time-invalid' => 'Cada hora de aviso debe escribirse como HH:mm.',
        'notifications' => 'Notificaciones por correo',
        'notificationsSubtitle' => 'Recibe un correo cuando se cree un nuevo recordatorio.',
        'emailNotifications' => 'Notificaciones por correo',
        'emailNotificationsOn' => 'Activado',
        'emailNotificationsOff' => 'Desactivado',
    ],

    'notifications' => [
        'created' => 'Recordatorio creado.',
        'deleted' => 'Notificación eliminada.',

        // Mensajes que genera la propia aplicación. Se guardan como una clave
        // y sus parámetros, así que se traducen al leerlos.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Autenticación de dos factores activada',
                'body' => 'La autenticación de dos factores está activada en tu cuenta. Al iniciar sesión se pedirá un código de tu aplicación de autenticación.',
            ],
            'two_factor_disabled' => [
                'title' => 'Autenticación de dos factores desactivada',
                'body' => 'La autenticación de dos factores está desactivada en tu cuenta. Para iniciar sesión solo hará falta tu contraseña.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'Un administrador ha desactivado tu autenticación de dos factores',
                'body' => ':actor ha desactivado la autenticación de dos factores de tu cuenta. A partir de ahora, para iniciar sesión solo hará falta tu contraseña.',
            ],
        ],
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Nuevo recordatorio en :app',
            'heading' => 'Nuevo recordatorio en :app',
            'intro' => 'Hola :name,',
            'body' => 'Tienes un nuevo recordatorio en tu diario. Abre la app para verlo.',
            'openDiary' => 'Abrir diario',
            'note' => 'Este correo no contiene contenido del diario. Tus entradas permanecen cifradas y solo se pueden leer en tu diario.',
        ],

        'two_factor' => [
            'intro' => 'Hola :name,',
            'two_factor_enabled' => [
                'subject' => 'Autenticación de dos factores activada en :app',
                'heading' => 'La autenticación de dos factores está activada',
                'body' => 'Has activado la autenticación de dos factores. A partir de ahora necesitarás un código de tu aplicación de autenticación, además de tu contraseña, para iniciar sesión. Guarda los códigos de recuperación en un lugar seguro.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Autenticación de dos factores desactivada en :app',
                'heading' => 'La autenticación de dos factores está desactivada',
                'body' => 'Has desactivado la autenticación de dos factores. Para iniciar sesión solo hará falta tu contraseña.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Autenticación de dos factores desactivada en :app',
                'heading' => 'Un administrador ha desactivado tu autenticación de dos factores',
                'body' => 'Un administrador (:actor) ha desactivado la autenticación de dos factores de tu cuenta. Para iniciar sesión solo hará falta tu contraseña.',
            ],
            'signedOut' => 'Por seguridad, se han cerrado todas las sesiones abiertas de tu cuenta, así que tendrás que iniciar sesión de nuevo.',
            'warning' => 'Si no esperabas este cambio, pide al administrador del diario que lo revise.',
            'openDiary' => 'Abrir diario',
            'noContent' => 'Este correo no contiene contenido del diario. Tus entradas permanecen cifradas y solo se pueden leer en tu diario.',
        ],
    ],

];
