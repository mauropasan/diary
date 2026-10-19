# Diario

A personal, single-user encrypted diary built with **Laravel + Inertia.js + React**.
One entry per day, unlimited rich text, stored **encrypted at rest** with a key
derived from your password. The default UI language is in English if no language
is detected; code, identifiers and commits are in English.

Serious about the "personal" part: there is **no public registration** once the
first account exists, **no password reset by email**, and the server never sees
your entries in plaintext once they are saved.

## What it does

- **One entry per day** (`/diary/YYYY-MM-DD`) with a TipTap rich text editor
  and autosave (~2 s debounce, "Guardando…" / "Guardado" indicator).
- **Envelope encryption** of `title` and `content` (see below). The plaintext
  `date` and `mood` stay queryable so the calendar, mood chart, streaks and
  "on this day" memories work without decrypting anything.
- **Calendar** highlighting days with content, plus previous/next day navigation.
- **Tags** with a blind index for lookup.
- **Mood tracking** with chart/table views and summary stats.
- **Schedules** (editable weekly grid per schedule, stored as JSON).
- **Daily prompts**, **streaks** and **"on this day"** memories.
- **Export** to Markdown (with mood summary) and **database backups** (SQLite
  `VACUUM INTO` or MySQL `mysqldump`, depending on the configured driver).
- **One-time registration** for the very first user, then a locked login screen.
- **Inactivity lock**: the encryption key is dropped from the session after
  `DIARY_LOCK_AFTER_MINUTES` (default 15) of inactivity; re-unlock asks only
  for the password, never a two-factor code.
- **Password change** re-wraps the key without ever re-encrypting entries.
- **Email change** from the settings page; an admin can also update the email
  of any other account from the same screen.
- **Two-factor authentication** (opt-in, TOTP): scan the setup key with an
  authenticator app, save one-time recovery codes and trust a browser for 30
  days so the code is asked only once. Turning it off asks for the account
  password again, and every change is reported to its owner by in-app
  notification and email. The recovery key still bypasses the challenge, and an
  admin can turn the second factor off if the device is lost (which signs the
  account out everywhere but is never silent).

## How encryption works

Nothing uses the login password hash or `APP_KEY` to encrypt entries.

1. On user creation a random **32-byte DEK** (data encryption key) is generated.
2. The password derives a **KEK** with **Argon2id** (`sodium_crypto_pwhash`) and
   a dedicated `kdf_salt`.
3. The DEK is **wrapped** with the KEK using AEAD (**XChaCha20-Poly1305**, fresh
   random nonce per message) and stored as `wrapped_key`. Only `kdf_salt` and
   `wrapped_key` are persisted — never the DEK or KEK.
4. A second copy of the DEK is wrapped with a random **recovery key**; the raw
   recovery key is shown **once** at creation and never stored.
5. While you are logged in, the DEK lives app-encrypted in the session with an
   expiry. Entry text is decrypted **on demand**, only for the entry you open.
6. **Changing the password** only re-wraps the DEK with the new KEK. The recovery
   copy keeps wrapping the same DEK, so it stays valid.

Losing the password **and** the recovery key means losing the diary — there is
no way around this by design.

## Tech stack

| Layer    | Technologies                                                        |
| -------- | ------------------------------------------------------------------- |
| Backend  | PHP 8.3+ (8.5 used), Laravel 13, Inertia 3, Wayfinder, Pest         |
| Crypto   | libsodium (`sodium_crypto_pwhash`, `crypto_aead_xchacha20poly1305`) |
| Frontend | React 19, TypeScript, Tailwind CSS 4, TipTap 3, `date-fns`          |
| Build    | Vite 8 (`vite-plus`), Laravel Vite plugin                           |
| Database | SQLite (default) or MySQL / MariaDB                                 |

## Requirements

- **PHP 8.3+** with the `sodium` extension enabled.
- **Composer 2**.
- **Node.js 20.19+** (or 22.12+) and **npm**.
- **Database** — one of the following:
    - **SQLite** (default): requires the `pdo_sqlite` extension (bundled with PHP).
    - **MySQL / MariaDB**: requires the `pdo_mysql` extension and a running server.
      The `mysqldump` binary must be in `PATH` for the backup command.

Verify the PHP extensions:

```bash
php -m | grep -E 'sodium|pdo_sqlite|pdo_mysql'
```

## Installation

The quickest path runs everything for you:

```bash
composer run setup
```

That script: installs PHP dependencies, copies `.env.example` to `.env`,
generates the app key, runs migrations, installs npm dependencies and builds
the frontend.

By default this uses **SQLite**. To use **MySQL** instead, edit `.env` before
running `php artisan migrate`:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=diary
DB_USERNAME=root
DB_PASSWORD=secret
```

### Manual steps (SQLite)

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite      # only if it does not exist yet
php artisan migrate
npm install
npm run build
```

### Manual steps (MySQL)

```bash
composer install
cp .env.example .env
php artisan key:generate
# Edit .env: set DB_CONNECTION=mysql and fill in DB_HOST, DB_PORT,
# DB_DATABASE, DB_USERNAME and DB_PASSWORD.
# Create the database first if it does not exist:
#   mysql -u root -e "CREATE DATABASE diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate
npm install
npm run build
```

## Running in development

Start the whole dev stack (PHP server, queue listener and Vite) with one command:

```bash
composer run dev
```

Or run the pieces separately:

```bash
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server with HMR (in another terminal)
```

The dev stack is **bound to `APP_URL`**: both the PHP server and Vite derive
their host from it (CDN: Vite also writes `public/hot` pointing at that host).
To make the diary reachable from other devices on your network, set
`APP_URL` to your LAN address, e.g.:

```dotenv
APP_URL=http://localhost:8000
```

then start `composer run dev` and open `http://localhost:8000` from any device
on the same network (firewall permitting).

> In the default `.env.example`, `APP_URL=http://localhost:8000`, which keeps
> everything working on just this machine.

> If a frontend change does not appear or you see "Unable to locate file in
> Vite manifest", run `npm run build` (production) or make sure `npm run dev`
> is running.

## Creating the first user

On a fresh database there are no accounts. Visit `/login` and you will be
redirected to **`/register`**, where you enter a name, email and password. The
account, its wrapped key material and a one-time **recovery key** are created
together, then you are logged in and the diary is unlocked. Save the recovery
key shown on screen.

Once a user exists, `/register` returns **404** and is never available again.

You can also create a user from the CLI (it prompts for name, email and
password and prints the recovery key):

```bash
php artisan diary:create-user
```

## Android app

The diary can be installed on Android through a Capacitor shell that loads the
hosted app, so content updates never need a new APK — only changes to the
native shell itself do.

```bash
npm run apk:release
```

The script (`scripts/apk.sh`):

1. regenerates the native `android/` project when it is missing
   (`npm run cap:init` on first use);
2. signs the release build with `storage/app/diary-release.keystore`
   (passwords come from `.env`: `DIARY_KEYSTORE_PASSWORD`, `DIARY_KEY_ALIAS`
   and optionally `DIARY_KEY_PASSWORD`);
3. stamps the APK with the git commit count as `versionCode`, so every build
   installs as an update of the previous one;
4. publishes the result to `storage/app/apk/diary.apk`.

The published APK is served by the public `GET /download` route (throttled,
and the APK carries no diary data), so the install link is always:

```
https://your-diary-host/download
```

nothing to copy around after a build.

> Back up `storage/app/diary-release.keystore` outside the machine: losing it
> makes future APKs uninstallable as updates of the already-installed ones.

Requirements: Node.js 22+ (Capacitor CLI), JDK 17+ and the Android SDK
(`ANDROID_HOME` / `ANDROID_SDK_ROOT`, or `android/local.properties`).

## Common commands

| Command                                      | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| `composer run dev`                           | Run the full dev stack (server + queue + Vite)            |
| `php artisan serve`                          | Serve the app only                                        |
| `npm run dev`                                | Vite dev server with HMR                                  |
| `npm run build`                              | Production frontend build                                 |
| `php artisan diary:backup`                   | Write a consistent DB snapshot to `storage/app/backups`   |
| `php artisan diary:remind`                   | Send the reminder emails whose moment has come            |
| `php artisan test`                           | Run the Pest test suite                                   |
| `composer run test`                          | Clear config, lint, static analysis and run tests         |
| `vendor/bin/pint`                            | Format PHP code (use `composer run lint`)                 |
| `npm run types:check`                        | TypeScript type check (`tsc --noEmit`)                    |
| `npm run check`                              | Frontend lint + format check (`npm run check:fix` to fix) |
| `npm run cap:init`                           | Generate the native `android/` Capacitor project          |
| `npm run apk:release`                        | Build, sign and publish the Android APK (`/download`)     |
| `php artisan migrate`                        | Run database migrations                                   |
| `php artisan wayfinder:generate --with-form` | Regenerate typed TS route/action helpers                  |

Keep `diary:backup` scheduled in production (e.g. a cron entry or the scheduler)
so snapshots are taken regularly.

## Reminder schedule

Each account decides when its reminders ring: Settings → Reminder schedule
configures how many days before the note's date (0 to 30, 0 meaning the day
itself only) and up to three daily hours. Every configured moment becomes its
own in-app notification, so the existing popup, read state and history keep
working; the first ping of a day is also emailed, so several daily hours never
turn into several daily emails.

Emails are not queued: the `php artisan diary:remind` sweep sends the ones whose
moment has come, and the scheduler runs it every minute. Production therefore
needs the usual scheduler cron entry, and no queue worker for reminders:

```cron
* * * * * cd /path-to-diary && php artisan schedule:run >> /dev/null 2>&1
```

Changing the schedule (or a note's date) only re-arms the pings still ahead:
what already popped, was read or was emailed stays behind as history.

## Configuration

Key environment variables (see `.env.example`):

| Variable                   | Default         | Notes                                         |
| -------------------------- | --------------- | --------------------------------------------- |
| `APP_TIMEZONE`             | `Europe/Madrid` | Defines what "today" means; not UTC.          |
| `APP_LOCALE`               | `es`            | UI language.                                  |
| `DB_CONNECTION`            | `sqlite`        | `sqlite` (default), `mysql` or `mariadb`.     |
| `SESSION_DRIVER`           | `database`      | Session storage.                              |
| `SESSION_ENCRYPT`          | `true`          | Encrypts session data (the DEK lives here).   |
| `SESSION_SECURE_COOKIE`    | `false`         | **Set to `true` in production (HTTPS).**      |
| `DIARY_LOCK_AFTER_MINUTES` | `15`            | Inactivity timeout before the DEK is dropped. |
| `DIARY_BACKUP_KEEP`        | `14`            | Number of `diary:backup` snapshots to retain. |

## Security notes

- Never log passwords, the DEK/KEK or entry content. Errors intentionally
  distinguish "wrong password" from "failed to unwrap the key (corrupted data)".
- Set `SESSION_SECURE_COOKIE=true` and serve over HTTPS in production.
- The database (SQLite file or MySQL tables) and session storage contain only
  ciphertext for entry text; back them up, but remember the recovery key is the
  only way back in if the password is lost.
- Two-factor authentication stores the TOTP secret encrypted with `APP_KEY` and
  the recovery codes as one-way hashes. The password-only inactivity unlock and
  the one-time recovery key never ask for a code, so a lost device never locks
  you out of your own diary.
- Switching the second factor off is the one security change that cannot be made
  from an unlocked browser alone: the acting account confirms its password
  (an administrator confirms their own before acting on somebody else's). When
  an administrator does it for another account, that account's sessions are
  dropped, its "remember me" token is rotated and all of its trusted browsers
  are revoked.
- Every two-factor change is announced on both channels the owner can see: an
  entry in the notification list and an email. They carry no diary content,
  and the entry is stored as a message key with its parameters encrypted with
  `APP_KEY` (not the diary key), so it can be raised for an account whose key
  the actor does not hold. Each admin action also leaves a `Log::notice` entry
  naming the actor.

## Project structure

```
app/
  Casts/        EncryptedEntryText        # Eloquent cast for encrypted columns
  Console/      CreateDiaryUser, BackupDiary, SendReminders
  Crypto/       DiaryCrypto, DiaryKeyManager, DiaryKeyStore, DiaryUnlocker, TagNameIndex
  Reminders/    ReminderSchedule, ReminderScheduler
  Security/     Totp, RecoveryCodes, TrustedDevices, TwoFactorNotifier
  Http/         Controllers, Middleware, Requests
  Models/       User, Entry, Tag, Schedule, TwoFactorDevice
  Mail/         ReminderNotification, TwoFactorStatusChanged
resources/js/
  pages/        auth/* and diary/* (Inertia React pages)
  components/   DiaryEditor, DiaryCalendar, TagInput, LockScreen, DiaryNav
  routes/       actions/   # generated by Wayfinder (do not edit)
routes/web.php  # all application routes
tests/          # Pest feature + unit tests (incl. crypto round-trip, locking)
```

## Tests

```bash
php artisan test            # everything
php artisan test tests/Unit/Crypto/DiaryCryptoTest.php
vendor/bin/pest --filter=diary
```

The suite covers the encryption round-trip, wrong-password handling, password
change with key re-wrap, inactivity lock, future-date rejection, the one-time
registration flow and the two-factor flows (enrolment, challenge, single-use
recovery codes, trusted browsers, the password confirmation before turning it
off and the notification and email each change raises).
