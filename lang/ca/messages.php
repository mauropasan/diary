<?php

return [

    'login' => [
        'failed' => 'Les credencials no coincideixen amb els nostres registres.',
        'unwrap-failed' => 'No s\'ha pogut desxifrar la clau del diari; les dades poden estar danyades.',
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
    ],

    'admin' => [
        'created' => 'Compte de :name creat. Entrega la contrasenya i la clau de recuperació al nou usuari.',
        'self-delete' => 'No pots eliminar el teu propi compte.',
        'deleted' => 'El compte de :name ha estat eliminat.',
        'email-updated' => 'El correu electrònic de :name s\'ha actualitzat.',
        'two-factor-disabled' => 'L\'autenticació de dos factors s\'ha desactivat per a :name.',
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
    ],

    'notifications' => [
        'created' => 'Recordatori creat.',
        'deleted' => 'Notificació esborrada.',
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
    ],

];
