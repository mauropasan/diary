<?php

return [

    'login' => [
        'failed' => 'Diese Anmeldedaten stimmen nicht mit unseren Aufzeichnungen überein.',
        'unwrap-failed' => 'Der Tagebuchschlüssel konnte nicht entschlüsselt werden; die Daten sind möglicherweise beschädigt.',
        'challenge-expired' => 'Dieser Anmeldeversuch ist abgelaufen. Bitte melden Sie sich erneut an.',
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

    'two_factor' => [
        'ready' => 'Scannen Sie den QR-Code und bestätigen Sie einen Code, um die Zwei-Faktor-Authentifizierung zu aktivieren.',
        'enabled' => 'Die Zwei-Faktor-Authentifizierung ist aktiv.',
        'disabled' => 'Die Zwei-Faktor-Authentifizierung ist deaktiviert.',
        'codes-regenerated' => 'Neue Wiederherstellungscodes wurden erstellt. Die vorherigen funktionieren nicht mehr.',
        'invalid-code' => 'Dieser Code ist nicht gültig. Prüfen Sie Ihre Authenticator-App und versuchen Sie es erneut.',
        'password-required' => 'Gib dein Passwort ein, um die Zwei-Faktor-Authentifizierung zu deaktivieren.',
        'invalid-password' => 'Dieses Passwort ist nicht korrekt, die Zwei-Faktor-Authentifizierung bleibt daher aktiv.',
    ],

    'admin' => [
        'created' => 'Konto für :name erstellt. Übergib das Passwort und den Wiederherstellungsschlüssel an den neuen Nutzer.',
        'self-delete' => 'Du kannst dein eigenes Konto nicht löschen.',
        'deleted' => 'Das Konto für :name wurde gelöscht.',
        'email-updated' => 'Die E-Mail-Adresse von :name wurde aktualisiert.',
        'two-factor-disabled' => 'Die Zwei-Faktor-Authentifizierung wurde für :name deaktiviert und alle Sitzungen wurden beendet.',
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
        'email-updated' => 'E-Mail-Adresse aktualisiert.',
        'notifications-updated' => 'E-Mail-Benachrichtigungen aktualisiert.',
        'reminder-updated' => 'Erinnerungsplan aktualisiert.',
        'reminder-days-invalid' => 'Wähle, wie viele Tage im Voraus erinnert wird, zwischen 0 und :max.',
        'reminder-times-invalid' => 'Wähle zwischen 1 und :max Erinnerungen pro Tag.',
        'reminder-time-invalid' => 'Jede Erinnerungszeit muss im Format HH:mm angegeben werden.',
    ],

    'notifications' => [
        'created' => 'Erinnerung erstellt.',
        'deleted' => 'Benachrichtigung gelöscht.',

        // Meldungen, die die Anwendung selbst auslöst. Sie werden als Schlüssel
        // und Parameter gespeichert und erst beim Lesen übersetzt.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Zwei-Faktor-Authentifizierung aktiviert',
                'body' => 'Die Zwei-Faktor-Authentifizierung ist für dein Konto aktiv. Beim Anmelden wird ein Code aus deiner Authenticator-App verlangt.',
            ],
            'two_factor_disabled' => [
                'title' => 'Zwei-Faktor-Authentifizierung deaktiviert',
                'body' => 'Die Zwei-Faktor-Authentifizierung ist für dein Konto deaktiviert. Zum Anmelden genügt wieder dein Passwort.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'Ein Administrator hat deine Zwei-Faktor-Authentifizierung deaktiviert',
                'body' => ':actor hat die Zwei-Faktor-Authentifizierung für dein Konto deaktiviert. Ab jetzt genügt zum Anmelden dein Passwort.',
            ],
        ],
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

        'two_factor' => [
            'intro' => 'Hallo :name,',
            'two_factor_enabled' => [
                'subject' => 'Zwei-Faktor-Authentifizierung in :app aktiviert',
                'heading' => 'Die Zwei-Faktor-Authentifizierung ist aktiv',
                'body' => 'Sie haben die Zwei-Faktor-Authentifizierung aktiviert. Ab jetzt benötigen Sie zum Anmelden zusätzlich zum Passwort einen Code aus Ihrer Authenticator-App. Bewahren Sie Ihre Wiederherstellungscodes sicher auf.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Zwei-Faktor-Authentifizierung in :app deaktiviert',
                'heading' => 'Die Zwei-Faktor-Authentifizierung ist deaktiviert',
                'body' => 'Sie haben die Zwei-Faktor-Authentifizierung deaktiviert. Zum Anmelden genügt wieder Ihr Passwort.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Zwei-Faktor-Authentifizierung in :app deaktiviert',
                'heading' => 'Ein Administrator hat Ihre Zwei-Faktor-Authentifizierung deaktiviert',
                'body' => 'Ein Administrator (:actor) hat die Zwei-Faktor-Authentifizierung für Ihr Konto deaktiviert. Zum Anmelden genügt wieder Ihr Passwort.',
            ],
            'signedOut' => 'Sicherheitshalber wurden alle offenen Sitzungen Ihres Kontos beendet; Sie müssen sich erneut anmelden.',
            'warning' => 'Wenn Sie diese Änderung nicht erwartet haben, wenden Sie sich an den Administrator des Tagebuchs.',
            'openDiary' => 'Tagebuch öffnen',
            'noContent' => 'Diese E-Mail enthält keinen Tagebuchinhalt. Ihre Einträge bleiben verschlüsselt und sind nur in der App lesbar.',
        ],
    ],

];
