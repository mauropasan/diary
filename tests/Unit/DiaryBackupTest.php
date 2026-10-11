<?php

use Illuminate\Support\Facades\File;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    $this->workDir = sys_get_temp_dir().'/diary-backup-'.uniqid();
    $this->database = $this->workDir.'/database.sqlite';
    $this->backups = $this->workDir.'/backups';

    File::ensureDirectoryExists($this->workDir);

    $pdo = new PDO('sqlite:'.$this->database);
    $pdo->exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)');
    $pdo->exec("INSERT INTO notes (body) VALUES ('hola')");
    $pdo = null;

    config([
        'database.default' => 'sqlite',
        'database.connections.sqlite.database' => $this->database,
        'diary.backup.path' => $this->backups,
        'diary.backup.keep' => 3,
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->workDir);
});

it('creates a consistent sqlite backup file', function () {
    $this->artisan('diary:backup')->assertSuccessful();

    $files = File::files($this->backups);

    expect($files)->toHaveCount(1);

    $pdo = new PDO('sqlite:'.$files[0]->getPathname());
    $count = (int) $pdo->query('SELECT COUNT(*) FROM notes')->fetchColumn();

    expect($count)->toBe(1);
});

it('prunes old backups beyond the keep limit', function () {
    config(['diary.backup.keep' => 2]);

    File::ensureDirectoryExists($this->backups);

    foreach ([0, 1, 2] as $index) {
        $path = $this->backups.'/diary-old-'.$index.'.sqlite';
        File::put($path, '');
        touch($path, now()->subDays(10 - $index)->getTimestamp());
    }

    $this->artisan('diary:backup')->assertSuccessful();

    expect(File::files($this->backups))->toHaveCount(2);
});

it('fails when the connection is not sqlite', function () {
    config(['database.default' => 'mysql']);

    $this->artisan('diary:backup')->assertFailed();
});

it('fails when the database file is missing', function () {
    config(['database.connections.sqlite.database' => $this->workDir.'/missing.sqlite']);

    $this->artisan('diary:backup')->assertFailed();
});
