<?php

return [

    'login' => [
        'failed' => 'Diese Anmeldedaten stimmen nicht mit unseren Aufzeichnungen überein.',
        'unwrap-failed' => 'Der Tagebuchschlüssel konnte nicht entschlüsselt werden; die Daten sind möglicherweise beschädigt.',
    ],

    'unlock' => [
        'wrong-password' => 'Das Passwort ist nicht korrekt.',
        'unwrap-failed' => 'Der Tagebuchschlüssel konnte nicht entschlüsselt werden; die Daten sind möglicherweise beschädigt.',
    ],

    'recovery' => [
        'no-account' => 'Für diese E-Mail-Adresse gibt es kein Konto mit einem Wiederherstellungsschlüssel.',
        'invalid-key' => 'Der Wiederherstellungsschlüssel ist ungültig oder die Daten sind beschädigt.',
        'restored' => 'Zugriff wiederhergestellt und Passwort aktualisiert.',
    ],

    'register' => [
        'ready' => 'Dein Tagebuch ist bereit.',
    ],

    'password' => [
        'updated' => 'Passwort aktualisiert. Der Tagebuchschlüssel wurde mit dem neuen Passwort erneut geschützt.',
        'unwrap-failed' => 'Der Tagebuchschlüssel konnte nicht entschlüsselt werden; die Daten sind möglicherweise beschädigt.',
    ],

    'admin' => [
        'created' => 'Konto für :name erstellt. Übergib das Passwort und den Wiederherstellungsschlüssel an den neuen Nutzer.',
        'self-delete' => 'Du kannst dein eigenes Konto nicht löschen.',
        'deleted' => 'Das Konto für :name wurde gelöscht.',
    ],

    'moods' => [
        1 => 'Sehr schlecht',
        2 => 'Schlecht',
        3 => 'Mittel',
        4 => 'Gut',
        5 => 'Sehr gut',
    ],

    'export' => [
        'title' => 'Tagebuch',
        'mood' => 'Stimmung: :mood',
        'tags' => 'Schlagwörter: :tags',
    ],

    'notes' => [
        'empty' => 'Schreibe einen Titel oder etwas Text.',
        'dated-kind-needs-date' => 'Eine Erinnerung oder ein Termin braucht einen Tag.',
    ],

    'settings' => [
        'background-updated' => 'Hintergrund aktualisiert.',
        'notifications-updated' => 'E-Mail-Benachrichtigungen aktualisiert.',
    ],

    'notifications' => [
        'created' => 'Erinnerung erstellt.',
        'deleted' => 'Benachrichtigung gelöscht.',
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Neue Erinnerung in :app',
            'heading' => 'Neue Erinnerung in :app',
            'intro' => 'Hallo :name,',
            'body' => 'Sie haben eine neue Erinnerung in Ihrem Tagebuch. Öffnen Sie die App, um sie zu sehen.',
            'openDiary' => 'Tagebuch öffnen',
            'note' => 'Diese E-Mail enthält keinen Tagebuchinhalt. Ihre Einträge bleiben verschlüsselt und sind nur in der App lesbar.',
        ],
    ],

];
