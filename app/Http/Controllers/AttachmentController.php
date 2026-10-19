<?php

namespace App\Http\Controllers;

use App\Crypto\DiaryCrypto;
use App\Crypto\DiaryKeyStore;
use App\Http\Requests\StoreAttachmentRequest;
use App\Models\Attachment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    public function __construct(
        private readonly DiaryCrypto $crypto,
        private readonly DiaryKeyStore $keys,
    ) {}

    /**
     * Store an uploaded file encrypted on disk and attach it to the entry.
     */
    public function store(StoreAttachmentRequest $request, string $date): JsonResponse|RedirectResponse
    {
        $day = $this->resolveDate($date);
        $user = $request->user();

        $file = $request->file('attachment');
        $mime = (string) ($file?->getMimeType() ?? 'application/octet-stream');

        $entry = $user->entries()->updateOrCreate(['date' => $day->toDateString()]);

        $blob = $this->crypto->encryptBytes((string) ($file?->get() ?? ''), $this->dek());

        $path = 'attachments/'.Str::uuid()->toString();
        Storage::disk('diary')->put($path, $blob);

        $attachment = $entry->attachments()->create([
            'user_id' => $user->id,
            'kind' => Attachment::kindForMime($mime),
            'original_name' => $file?->getClientOriginalName() ?? 'archivo',
            'mime_type' => $mime,
            'size' => $file?->getSize() ?? strlen($blob),
            'path' => $path,
        ]);

        $payload = [
            'attachment' => [
                'id' => $attachment->getKey(),
                'kind' => $attachment->kind,
                'original_name' => $attachment->original_name,
                'mime' => $attachment->mime_type,
                'size' => $attachment->size,
                'src' => route('diary.attachments.show', $attachment),
            ],
        ];

        if ($request->wantsJson()) {
            return response()->json($payload, 201);
        }

        return redirect()->route('diary.show', $day->toDateString());
    }

    /**
     * Stream a decrypted attachment to the requestor, inline for images and as
     * a download for everything else.
     */
    public function show(Request $request, Attachment $attachment): Response
    {
        if ($request->user()->id !== $attachment->user_id) {
            abort(404);
        }

        if (! Storage::disk('diary')->exists($attachment->path)) {
            abort(404);
        }

        $plaintext = $this->crypto->decryptBytes(
            (string) Storage::disk('diary')->get($attachment->path),
            $this->dek(),
        );

        $headers = [
            'Content-Type' => $attachment->mime_type,
            'Content-Length' => (string) strlen($plaintext),
            'Cache-Control' => 'private, no-store, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
            'Cross-Origin-Resource-Policy' => 'same-origin',
        ];

        if ($attachment->kind !== 'image') {
            $headers['Content-Disposition'] = 'attachment; filename="'.Str::ascii($attachment->original_name).'"'
                .'; filename*=UTF-8\'\''.rawurlencode($attachment->original_name);
        }

        return response($plaintext, 200, $headers);
    }

    private function dek(): string
    {
        $dek = $this->keys->get();

        if ($dek === null) {
            abort(403);
        }

        return $dek;
    }

    /**
     * Resolve and validate the day from the route, blocking future dates.
     */
    private function resolveDate(string $date): CarbonImmutable
    {
        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, config('app.timezone'));

        if ($day === null || $day->toDateString() !== $date || $day->isAfter(CarbonImmutable::today())) {
            abort(404);
        }

        return $day->startOfDay();
    }
}
