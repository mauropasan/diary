<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('downloads the diary as a markdown attachment', function () {
    $today = now()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Mi día',
        'content' => '<p>Hola <strong>mundo</strong></p>',
        'mood' => 4,
        'tags' => ['Trabajo'],
    ]);

    $response = $this->get(route('diary.export.markdown'));

    $response->assertOk()
        ->assertHeader('Content-Type', 'text/markdown; charset=UTF-8')
        ->assertHeader('Content-Disposition', 'attachment; filename="diario.md"');

    $markdown = $response->getContent();

    expect($markdown)
        ->toContain('# Diario')
        ->toContain('## Mi día')
        ->toContain('**mundo**')
        ->toContain('Ánimo: Bien')
        ->toContain('Etiquetas: Trabajo');
});

it('orders exported entries from oldest to newest', function () {
    $today = now()->toDateString();
    $yesterday = now()->subDay()->toDateString();

    $this->put(route('diary.update', $today), [
        'title' => 'Entrada de hoy',
        'content' => '<p>Hoy</p>',
    ]);
    $this->put(route('diary.update', $yesterday), [
        'title' => 'Entrada de ayer',
        'content' => '<p>Ayer</p>',
    ]);

    $markdown = $this->get(route('diary.export.markdown'))->getContent();

    expect(strpos($markdown, '## Entrada de ayer'))
        ->toBeLessThan(strpos($markdown, '## Entrada de hoy'));
});

it('exports an empty diary gracefully', function () {
    $this->get(route('diary.export.markdown'))
        ->assertOk()
        ->assertSee('# Diario', false);
});

it('shows the export page with decrypted entries', function () {
    $this->put(route('diary.update', now()->toDateString()), [
        'title' => 'Recuerdo',
        'content' => '<p>Contenido secreto</p>',
    ]);

    $this->get(route('diary.export'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/export')
            ->where('entries.0.title', 'Recuerdo')
            ->where('entries.0.content', '<p>Contenido secreto</p>')
        );
});
