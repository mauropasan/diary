it('finds notes and reminders in search results', function () {
    $today = now()->toDateString();

    $this->post(route('diary.notes.store'), [
        'title' => 'Buy milk',
        'body' => 'From the store',
        'kind' => 'note',
    ]);

    $this->post(route('diary.notes.store'), [
        'title' => 'Dentist',
        'body' => 'Check-up',
        'kind' => 'reminder',
        'date' => $today,
    ]);

    $this->get(route('diary.search').'?q=milk')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/search')
            ->where('results.0.title', 'Buy milk')
            ->where('results.0.kind', 'note')
        );

    $this->get(route('diary.search').'?q=dentist')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/search')
            ->where('results.0.title', 'Dentist')
            ->where('results.0.kind', 'reminder')
        );
});

it('finds notes by body content', function () {
    $this->post(route('diary.notes.store'), [
        'body' => 'Write a poem',
        'kind' => 'note',
    ]);

    $this->get(route('diary.search').'?q=poem')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('diary/search')
            ->has('results', 1)
            ->where('results.0.excerpt', fn ($excerpt) => str_contains((string) $excerpt, 'poem'))
        );
});
