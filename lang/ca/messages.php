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

    'admin' => [
        'created' => 'Compte de :name creat. Entrega la contrasenya i la clau de recuperació al nou usuari.',
        'self-delete' => 'No pots eliminar el teu propi compte.',
        'deleted' => 'El compte de :name ha estat eliminat.',
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
    ],

];
