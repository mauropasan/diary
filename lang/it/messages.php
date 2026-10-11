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

    'admin' => [
        'created' => 'Account di :name creato. Consegna la password e la chiave di recupero al nuovo utente.',
        'self-delete' => 'Non puoi eliminare il tuo account.',
        'deleted' => 'L\'account di :name è stato eliminato.',
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

];
