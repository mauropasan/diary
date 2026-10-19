<?php

use App\Models\Attachment;
use App\Models\Entry;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('diary');

    $this->user = User::factory()->withDiaryKey('secret-password')->create();

    $this->actingAs($this->user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);
});

it('stores an uploaded file encrypted and returns its metadata', function () {
    $today = now()->toDateString();

    $response = $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ])->assertCreated();

    $id = $response->json('attachment.id');

    expect($response->json('attachment.src'))->toBe(route('diary.attachments.show', $id))
        ->and($response->json('attachment.kind'))->toBe('image')
        ->and($response->json('attachment.original_name'))->toBe('foto.png');

    $this->assertDatabaseCount('attachments', 1);
    $this->assertDatabaseCount('entries', 1);

    $attachment = Attachment::firstOrFail();

    expect($attachment->getRawOriginal('original_name'))->not->toBe('foto.png');

    Storage::disk('diary')->assertExists($attachment->path);

    $blob = Storage::disk('diary')->get($attachment->path);
    expect($blob)->not->toContain('PNG');
});

it('classifies uploaded files by mime type', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->create('voz.mp3', 1, 'audio/mpeg'),
    ])->assertJsonPath('attachment.kind', 'audio');

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->create('clip.mp4', 1, 'video/mp4'),
    ])->assertJsonPath('attachment.kind', 'video');

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->create('doc.pdf', 1, 'application/pdf'),
    ])->assertJsonPath('attachment.kind', 'file');

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->create('img.svg', 1, 'image/svg+xml'),
    ])->assertJsonPath('attachment.kind', 'file');
});

it('serves the decrypted file to its owner', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $attachment = Attachment::firstOrFail();

    $response = $this->get(route('diary.attachments.show', $attachment))
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff');

    expect($response->headers->get('Cache-Control'))->toContain('no-store');

    $blob = Storage::disk('diary')->get($attachment->path);

    expect($response->getContent())->not->toBe($blob)
        ->and(strlen((string) $response->getContent()))->toBe($attachment->size);
});

it('downloads non-image files instead of serving them inline', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->create('nota.txt', 1, 'text/plain'),
    ]);

    $attachment = Attachment::firstOrFail();

    $this->get(route('diary.attachments.show', $attachment))
        ->assertOk()
        ->assertHeader('Content-Disposition', "attachment; filename=\"nota.txt\"; filename*=UTF-8''nota.txt");
});

it('hides attachments from other users', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $attachment = Attachment::firstOrFail();

    $other = User::factory()->withDiaryKey('other-secret')->create();

    $this->actingAs($other)
        ->post(route('diary.unlock.store'), ['password' => 'other-secret']);

    $this->get(route('diary.attachments.show', $attachment))
        ->assertNotFound();
});

it('locks media behind the unlock screen', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $attachment = Attachment::firstOrFail();

    $this->post(route('diary.lock'));

    $this->get(route('diary.attachments.show', $attachment))
        ->assertRedirect(route('diary.unlock'));
});

it('rejects uploads for future dates', function () {
    $tomorrow = now()->addDay()->toDateString();

    $this->postJson(route('diary.attachments.store', $tomorrow), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['date' => 'You cannot attach files on future dates.']);

    $this->assertDatabaseCount('attachments', 0);
});

it('requires an attachment file', function () {
    $this->postJson(route('diary.attachments.store', now()->toDateString()), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('attachment');
});

it('deletes attachments that are no longer referenced in the content', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $attachment = Attachment::firstOrFail();

    $this->put(route('diary.update', $today), [
        'content' => '<figure data-media=""
            data-kind="image"
            data-attachment-id="'.$attachment->id.'"><img src="/diary/attachments/'.$attachment->id.'" /></figure>',
    ])->assertRedirect(route('diary.show', $today));

    $this->assertDatabaseCount('attachments', 1);

    $this->put(route('diary.update', $today), [
        'content' => '<p>Ya sin imagen</p>',
    ]);

    $this->assertDatabaseCount('attachments', 0);
    Storage::disk('diary')->assertMissing($attachment->path);
});

it('keeps an entry that only contains media', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $entry = Entry::firstOrFail();
    $attachment = Attachment::firstOrFail();

    $this->put(route('diary.update', $today), [
        'content' => '<figure data-media=""
            data-kind="image"
            data-attachment-id="'.$attachment->id.'"><img src="/diary/attachments/'.$attachment->id.'" /></figure>',
        'title' => '',
        'mood' => null,
    ]);

    $this->assertDatabaseHas('entries', ['id' => $entry->id]);
    $this->assertDatabaseCount('attachments', 1);
});

it('removes the attached files when the entry is deleted', function () {
    $today = now()->toDateString();

    $this->postJson(route('diary.attachments.store', $today), [
        'attachment' => UploadedFile::fake()->image('foto.png'),
    ]);

    $attachment = Attachment::firstOrFail();

    $this->put(route('diary.update', $today), [
        'content' => '<p></p>',
        'title' => '',
        'mood' => null,
    ]);

    $this->assertDatabaseCount('entries', 0);
    $this->assertDatabaseCount('attachments', 0);
    Storage::disk('diary')->assertMissing($attachment->path);
});
