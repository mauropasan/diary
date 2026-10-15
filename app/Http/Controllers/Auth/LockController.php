<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyStore;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LockController extends Controller
{
    /**
     * Lock the diary by discarding the data encryption key from the session.
     *
     * A plain request from the inactivity timer gets an empty response so the
     * lock overlay can stay mounted on the entry being edited, while an Inertia
     * visit is sent to the unlock screen — that is where the lock button in the
     * navigation menu lands.
     */
    public function store(Request $request, DiaryKeyStore $store): RedirectResponse|Response
    {
        $store->forget();

        if ($request->header('X-Inertia')) {
            return redirect()->route('diary.unlock');
        }

        return response()->noContent();
    }
}
