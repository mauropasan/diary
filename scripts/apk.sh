#!/usr/bin/env bash

# Build a signed release APK and publish it where the Laravel `/download`
# route serves it (storage/app/apk/diary.apk), so the install link always
# points to the latest build.
#
# Requirements:
#   - Node.js >= 22 (Capacitor CLI)
#   - JDK 17+
#   - Android SDK (ANDROID_HOME / ANDROID_SDK_ROOT, or android/local.properties)
#   - A .env with DIARY_KEYSTORE_PASSWORD and DIARY_KEY_ALIAS (and optionally
#     DIARY_KEY_PASSWORD, defaulting to the store password)
#   - The release keystore at storage/app/diary-release.keystore

set -euo pipefail

cd "$(dirname "$0")/.."

KEYSTORE="$PWD/storage/app/diary-release.keystore"
PROPERTIES="android/diary-build.properties"
OUTPUT_APK="android/app/build/outputs/apk/release/app-release.apk"
PUBLISHED_APK="storage/app/apk/diary.apk"

env_value() {
    sed -n "s/^${1}=//p" .env 2>/dev/null | head -1 | tr -d '\r' | tr -d '"'"'"''
}

# The signing config is appended to the generated build.gradle, which
# `npx cap add android` recreates from the Capacitor template; re-add the
# platform when it is missing, and the block when it was regenerated.
if [ ! -d android ]; then
    npx cap add android
fi

KEYSTORE_PASSWORD="$(env_value DIARY_KEYSTORE_PASSWORD)"
KEY_ALIAS="$(env_value DIARY_KEY_ALIAS)"
KEY_PASSWORD="$(env_value DIARY_KEY_PASSWORD)"

if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ]; then
    echo "DIARY_KEYSTORE_PASSWORD and DIARY_KEY_ALIAS must be set in .env" >&2
    exit 1
fi

if [ ! -f "$KEYSTORE" ]; then
    echo "Keystore not found: $KEYSTORE" >&2
    echo "Back it up: losing it makes future updates uninstallable." >&2
    exit 1
fi

# The commit count only ever grows, so every build has a higher versionCode
# than the previous one and Android accepts it as an update.
VERSION_CODE="$(git rev-list --count HEAD)"

cat > "$PROPERTIES" <<EOF
storeFile=$KEYSTORE
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=${KEY_PASSWORD:-$KEYSTORE_PASSWORD}
versionCode=$VERSION_CODE
versionName=1.$VERSION_CODE
EOF

if ! grep -q 'BEGIN DIARY SIGNING' android/app/build.gradle; then
    cat >> android/app/build.gradle <<'EOF'

// BEGIN DIARY SIGNING
// Appended by scripts/apk.sh; removed when `npx cap add android` regenerates
// the project, so the script re-adds it on the next build. Do not edit.
android {
    def diaryBuild = new Properties()
    diaryBuild.load(new FileInputStream(rootProject.file('diary-build.properties')))

    signingConfigs {
        release {
            storeFile file(diaryBuild.getProperty('storeFile'))
            storePassword diaryBuild.getProperty('storePassword')
            keyAlias diaryBuild.getProperty('keyAlias')
            keyPassword diaryBuild.getProperty('keyPassword')
        }
    }
    defaultConfig {
        versionCode diaryBuild.getProperty('versionCode') as int
        versionName diaryBuild.getProperty('versionName')
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
// END DIARY SIGNING
EOF
fi

npx cap sync android

(cd android && ./gradlew assembleRelease)

mkdir -p "$(dirname "$PUBLISHED_APK")"
cp "$OUTPUT_APK" "$PUBLISHED_APK"

APP_URL="$(env_value APP_URL)"
VERSION="$(sed -n 's/^versionName=//p' "$PROPERTIES")"

echo "APK published: $PUBLISHED_APK (version $VERSION)"
echo "Install link:  ${APP_URL:-<APP_URL>}/download"
