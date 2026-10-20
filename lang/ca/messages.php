<?php

return [

    'login' => [
        'failed' => 'Les credencials no coincideixen amb els nostres registres.',
        'unwrap-failed' => 'No s\'ha pogut desxifrar la clau del diari; les dades poden estar danyades.',
        'challenge-expired' => 'Aquest intent d\'inici de sessió ha caducat. Inicia sessió de nou.',
    ],

    'unlock' => [
        'wrong-password' => 'La contrasenya no és correcta.',
        'unwrap-failed' => 'No s\'ha pogut desxifrar la clau del diari; les dades poden estar danyades.',
    ],

    'recovery' => [
        'no-account' => 'No hi ha cap compte amb clau de recuperació per a aquest correu.',
        'invalid-key' => 'La clau de recuperació no és vàlida o les dades estan danyades.',
        'restored' => 'Accés restaurat i contrasenya actualitzada.',
    ],

    'register' => [
        'ready' => 'El teu diari ja està llest.',
    ],

    'password' => [
        'updated' => 'Contrasenya actualitzada. La clau del diari s\'ha tornat a protegir amb la nova contrasenya.',
        'unwrap-failed' => 'No s\'ha pogut desxifrar la clau del diari; les dades poden estar danyades.',
    ],

    'two_factor' => [
        'ready' => 'Escaneja el codi QR i confirma un codi per activar l\'autenticació de dos factors.',
        'enabled' => 'L\'autenticació de dos factors està activada.',
        'disabled' => 'L\'autenticació de dos factors està desactivada.',
        'codes-regenerated' => 'S\'han generat codis de recuperació nous. Els anteriors ja no funcionen.',
        'invalid-code' => 'Aquest codi no és vàlid. Comproveu l\'aplicació d\'autenticació i torneu-ho a provar.',
        'password-required' => 'Escriu la teva contrasenya per desactivar l\'autenticació de dos factors.',
        'invalid-password' => 'Aquesta contrasenya no és correcta, així que l\'autenticació de dos factors continua activada.',
    ],

    'admin' => [
        'created' => 'Compte de :name creat. Entrega la contrasenya i la clau de recuperació al nou usuari.',
        'self-delete' => 'No pots eliminar el teu propi compte.',
        'deleted' => 'El compte de :name ha estat eliminat.',
        'email-updated' => 'El correu electrònic de :name s\'ha actualitzat.',
        'two-factor-disabled' => 'L\'autenticació de dos factors s\'ha desactivat per a :name i s\'ha tancat la seva sessió a tots els dispositius.',
    ],

    'moods' => [
        1 => 'Molt malament',
        2 => 'Malament',
        3 => 'Regular',
        4 => 'Bé',
        5 => 'Molt bé',
    ],

    'export' => [
        'title' => 'Diari',
        'mood' => 'Ànim: :mood',
        'tags' => 'Etiquetes: :tags',
    ],

    'notes' => [
        'empty' => 'Escriu un títol o una mica de text.',
        'dated-kind-needs-date' => 'Un recordatori o un esdeveniment necessita una data.',
    ],

    'settings' => [
        'background-updated' => 'Fons actualitzat.',
        'email-updated' => 'Correu electrònic actualitzat.',
        'notifications-updated' => 'Notificacions per correu actualitzades.',
        'reminder-updated' => 'Programació de recordatoris actualitzada.',
        'reminder-days-invalid' => 'Tria amb quants dies d\'antelació avisar, entre 0 i :max.',
        'reminder-times-invalid' => 'Tria entre 1 i :max avisos al dia.',
        'reminder-time-invalid' => 'Cada hora d\'avís s\'ha d\'escriure com a HH:mm.',
    ],

    'notifications' => [
        'created' => 'Recordatori creat.',
        'deleted' => 'Notificació esborrada.',

        // Missatges que genera la mateixa aplicació. S\'emmagatzemen com una
        // clau i els seus paràmetres, de manera que es poden traduir en llegir-los.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Autenticació de dos factors activada',
                'body' => 'L\'autenticació de dos factors està activada al teu compte. Per iniciar sessió caldrà un codi de la teva aplicació d\'autenticació.',
            ],
            'two_factor_disabled' => [
                'title' => 'Autenticació de dos factors desactivada',
                'body' => 'L\'autenticació de dos factors està desactivada al teu compte. Per iniciar sessió només caldrà la contrasenya.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'Un administrador ha desactivat la teva autenticació de dos factors',
                'body' => ':actor ha desactivat l\'autenticació de dos factors del teu compte. A partir d\'ara, per iniciar sessió només caldrà la contrasenya.',
            ],
        ],
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Nou recordatori a :app',
            'heading' => 'Nou recordatori a :app',
            'intro' => 'Hola :name,',
            'body' => 'Tens un nou recordatori al teu diari. Obrir l\'aplicació per veure\'l.',
            'openDiary' => 'Obre el diari',
            'note' => 'Aquest correu no conté contingut del diari. Les teves entrades segueixen xifrades i només es poden llegir al teu diari.',
        ],

        'two_factor' => [
            'intro' => 'Hola :name,',
            'two_factor_enabled' => [
                'subject' => 'Autenticació de dos factors activada a :app',
                'heading' => 'L\'autenticació de dos factors està activada',
                'body' => 'Has activat l\'autenticació de dos factors. A partir d\'ara, per iniciar sessió caldrà un codi de la teva aplicació d\'autenticació, a més de la contrasenya. Guarda els codis de recuperació en un lloc segur.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Autenticació de dos factors desactivada a :app',
                'heading' => 'L\'autenticació de dos factors està desactivada',
                'body' => 'Has desactivat l\'autenticació de dos factors. Per iniciar sessió només caldrà la contrasenya.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Autenticació de dos factors desactivada a :app',
                'heading' => 'Un administrador ha desactivat la teva autenticació de dos factors',
                'body' => 'Un administrador (:actor) ha desactivat l\'autenticació de dos factors del teu compte. Per iniciar sessió només caldrà la contrasenya.',
            ],
            'signedOut' => 'Per seguretat, s\'han tancat totes les sessions obertes al teu compte, així que hauràs de tornar a iniciar sessió.',
            'warning' => 'Si no esperaves aquest canvi, demana a l\'administrador del diari que ho revisi.',
            'openDiary' => 'Obre el diari',
            'noContent' => 'Aquest correu no conté contingut del diari. Les teves entrades segueixen xifrades i només es poden llegir al teu diari.',
        ],
    ],

];
