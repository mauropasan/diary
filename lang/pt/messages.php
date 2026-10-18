<?php

return [

    'login' => [
        'failed' => 'As credenciais indicadas não correspondem aos nossos registos.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'unlock' => [
        'wrong-password' => 'A palavra-passe está incorreta.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'recovery' => [
        'no-account' => 'Não existe nenhuma conta com chave de recuperação para esse email.',
        'invalid-key' => 'A chave de recuperação não é válida ou os dados estão corrompidos.',
        'restored' => 'Acesso restaurado e palavra-passe atualizada.',
    ],

    'register' => [
        'ready' => 'O teu diário está pronto.',
    ],

    'password' => [
        'updated' => 'Palavra-passe atualizada. A chave do diário foi novamente protegida com a nova palavra-passe.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'two_factor' => [
        'ready' => 'Escaneie o código QR e confirme um código para ativar a autenticação de dois fatores.',
        'enabled' => 'A autenticação de dois fatores está ativa.',
        'disabled' => 'A autenticação de dois fatores está desativada.',
        'codes-regenerated' => 'Novos códigos de recuperação gerados. Os anteriores já não funcionam.',
        'invalid-code' => 'Esse código não é válido. Verifica a tua aplicação de autenticação e tenta novamente.',
        'password-required' => 'Escreve a tua palavra-passe para desativar a autenticação de dois fatores.',
        'invalid-password' => 'Essa palavra-passe não está correta, por isso a autenticação de dois fatores continua ativa.',
    ],

    'admin' => [
        'created' => 'Conta de :name criada. Entrega a palavra-passe e a chave de recuperação ao novo utilizador.',
        'self-delete' => 'Não podes eliminar a tua própria conta.',
        'deleted' => 'A conta de :name foi eliminada.',
        'email-updated' => 'O e-mail de :name foi atualizado.',
        'two-factor-disabled' => 'A autenticação de dois fatores foi desativada para :name e todas as suas sessões foram encerradas.',
    ],

    'moods' => [
        1 => 'Muito mau',
        2 => 'Mau',
        3 => 'Razoável',
        4 => 'Bom',
        5 => 'Muito bom',
    ],

    'export' => [
        'title' => 'Diário',
        'mood' => 'Humor: :mood',
        'tags' => 'Etiquetas: :tags',
    ],

    'notes' => [
        'empty' => 'Escreve um título ou algum texto.',
        'dated-kind-needs-date' => 'Um lembrete ou um evento precisa de um dia.',
    ],

    'settings' => [
        'background-updated' => 'Fundo atualizado.',
        'email-updated' => 'E-mail atualizado.',
        'notifications-updated' => 'Notificações de e-mail atualizadas.',
        'reminder-updated' => 'Agenda de lembretes atualizada.',
        'reminder-days-invalid' => 'Escolhe quantos dias antes avisar, entre 0 e :max.',
        'reminder-times-invalid' => 'Escolhe entre 1 e :max lembretes por dia.',
        'reminder-time-invalid' => 'Cada hora de lembrete deve ser escrita como HH:mm.',
    ],

    'notifications' => [
        'created' => 'Lembrete criado.',
        'deleted' => 'Notificação eliminada.',

        // Mensagens que a própria aplicação gera. São guardadas como chave e
        // parâmetros, por isso são traduzidas no momento da leitura.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Autenticação de dois fatores ativada',
                'body' => 'A autenticação de dois fatores está ativa na tua conta. Ao iniciares sessão será pedido um código da tua aplicação de autenticação.',
            ],
            'two_factor_disabled' => [
                'title' => 'Autenticação de dois fatores desativada',
                'body' => 'A autenticação de dois fatores está desativada na tua conta. Para iniciares sessão basta a tua palavra-passe.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'Um administrador desativou a tua autenticação de dois fatores',
                'body' => ':actor desativou a autenticação de dois fatores da tua conta. A partir de agora, para iniciares sessão basta a tua palavra-passe.',
            ],
        ],
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Novo lembrete em :app',
            'heading' => 'Novo lembrete em :app',
            'intro' => 'Olá :name,',
            'body' => 'Tem um novo lembrete no seu diário. Abra a aplicação para ver.',
            'openDiary' => 'Abrir diário',
            'note' => 'Este e-mail não contém conteúdo do diário. As suas entradas permanecem cifradas e só podem ser lidas no seu diário.',
        ],

        'two_factor' => [
            'intro' => 'Olá :name,',
            'two_factor_enabled' => [
                'subject' => 'Autenticação de dois fatores ativada em :app',
                'heading' => 'A autenticação de dois fatores está ativa',
                'body' => 'Ativaste a autenticação de dois fatores. A partir de agora, para iniciares sessão vais precisar de um código da tua aplicação de autenticação, além da palavra-passe. Guarda os códigos de recuperação num local seguro.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Autenticação de dois fatores desativada em :app',
                'heading' => 'A autenticação de dois fatores está desativada',
                'body' => 'Desativaste a autenticação de dois fatores. Para iniciares sessão basta a tua palavra-passe.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Autenticação de dois fatores desativada em :app',
                'heading' => 'Um administrador desativou a tua autenticação de dois fatores',
                'body' => 'Um administrador (:actor) desativou a autenticação de dois fatores da tua conta. Para iniciares sessão basta a tua palavra-passe.',
            ],
            'signedOut' => 'Por segurança, todas as sessões abertas na tua conta foram encerradas, por isso terás de iniciar sessão novamente.',
            'warning' => 'Se não esperavas esta alteração, pede ao administrador do diário para verificar.',
            'openDiary' => 'Abrir diário',
            'noContent' => 'Este e-mail não contém conteúdo do diário. As tuas entradas permanecem cifradas e só podem ser lidas no teu diário.',
        ],
    ],

];
