<?php

return [

    'login' => [
        'failed' => 'Le credenziali fornite non corrispondono ai nostri dati.',
        'unwrap-failed' => 'Impossibile decifrare la chiave del diario; i dati potrebbero essere danneggiati.',
    ],

    'unlock' => [
        'wrong-password' => 'La password non è corretta.',
        'unwrap-failed' => 'Impossibile decifrare la chiave del diario; i dati potrebbero essere danneggiati.',
    ],

    'recovery' => [
        'no-account' => 'Non esiste nessun account con chiave di recupero per quell\'email.',
        'invalid-key' => 'La chiave di recupero non è valida oppure i dati sono danneggiati.',
        'restored' => 'Accesso ripristinato e password aggiornata.',
    ],

    'register' => [
        'ready' => 'Il tuo diario è pronto.',
    ],

    'password' => [
        'updated' => 'Password aggiornata. La chiave del diario è stata protetta di nuovo con la nuova password.',
        'unwrap-failed' => 'Impossibile decifrare la chiave del diario; i dati potrebbero essere danneggiati.',
    ],

    'two_factor' => [
        'ready' => 'Scansiona il codice QR e conferma un codice per attivare l\'autenticazione a due fattori.',
        'enabled' => 'L\'autenticazione a due fattori è attiva.',
        'disabled' => 'L\'autenticazione a due fattori è disattivata.',
        'codes-regenerated' => 'Sono stati generati nuovi codici di recupero. I precedenti non funzionano più.',
        'invalid-code' => 'Quel codice non è valido. Controlla la tua app di autenticazione e riprova.',
    ],

    'admin' => [
        'created' => 'Account di :name creato. Consegna la password e la chiave di recupero al nuovo utente.',
        'self-delete' => 'Non puoi eliminare il tuo account.',
        'deleted' => 'L\'account di :name è stato eliminato.',
        'email-updated' => 'L\'email di :name è stata aggiornata.',
        'two-factor-disabled' => 'L\'autenticazione a due fattori è stata disattivata per :name.',
    ],

    'moods' => [
        1 => 'Molto male',
        2 => 'Male',
        3 => 'Così così',
        4 => 'Bene',
        5 => 'Molto bene',
    ],

    'export' => [
        'title' => 'Diario',
        'mood' => 'Umore: :mood',
        'tags' => 'Tag: :tags',
    ],

    'notes' => [
        'empty' => 'Scrivi un titolo o un po\' di testo.',
        'dated-kind-needs-date' => 'Un promemoria o un evento ha bisogno di un giorno.',
    ],

    'settings' => [
        'background-updated' => 'Sfondo aggiornato.',
        'email-updated' => 'Email aggiornata.',
        'notifications-updated' => 'Notifiche email aggiornate.',
    ],

    'notifications' => [
        'created' => 'Promemoria creato.',
        'deleted' => 'Notifica eliminata.',
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Nuovo promemoria in :app',
            'heading' => 'Nuovo promemoria in :app',
            'intro' => 'Ciao :name,',
            'body' => 'Hai un nuovo promemoria nel tuo diario. Apri l\'app per vederlo.',
            'openDiary' => 'Apri diario',
            'note' => 'Questa email non contiene contenuti del diario. Le tue voci rimangono cifrate e leggibili solo nel tuo diario.',
        ],
    ],

];
