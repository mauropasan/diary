<?php

namespace App\Http\Controllers\Auth;

use App\Crypto\DiaryKeyStore;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class LockController extends Controller
{
    /**
     * Lock the diary by discarding the data encryption key from the session.
     *
     * The client calls this when the inactivity timer fires so the server stops
     * serving entries even though the guarding middleware refreshed the
     * inactivity deadline on the autosave request that preceded the lock.
     */
    public function store(DiaryKeyStore $store): Response
    {
        $store->forget();

        return response()->noContent();
    }
}
