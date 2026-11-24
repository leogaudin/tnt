# Android app

Native Kotlin app (Views, CameraX, ZXing, WorkManager), minSdk 24. No Google Play Services.

    ../assemble debug <country>      # APK in dist/mobile
    ../assemble release <country>
    ./gradlew testDebugUnitTest lintDebug -PtntCountry=_default

The country comes from `mobile/countries/<country>/` (see `mobile/README.md`); the version from `version.json`,
shared with the iOS app (`versionCode = major * 10000 + minor * 100 + patch`).

## Signing: do not change it

Every country is distributed as a sideloaded APK signed with `app/debug.keystore` (certificate SHA-256
`fac61745dc09…`). An update only installs over an APK signed with the same key, so this file must stay as it is.
A different key per country can be set with `mobile/countries/<country>/signing.properties` or
`$TNT_KEYSTORE_DIR/<country>.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`); never commit them.

## From the React Native app

`data/RnMigration.kt` imports the login and the unsent scans of the old React Native app on the first launch after an
update. It can be removed once no phone with a 1.x version is left.
