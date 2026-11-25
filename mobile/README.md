# Mobile country configs

One folder per country, read by both mobile apps: the Android app (`android/`) and the iOS app (`ios/`). It has the
same layout as `client/countries/` and `server/countries/`, which the tests and the standalone export rely on.

- `<country>/config.json`: `applicationId` (also the iOS bundle id), `appName`, `apiUrl` and `colors`
  (`lightest`, `light`, `main`, `dark`, `darkest`; `main` is the primary colour). Phones have the API URL built in, so
  it must never change for a country that is in the field.
- `<country>/config.json`, optional: `language` (`en` by default, or `fr`: the one language the whole app is written in,
  whatever the phone's) and `strings` (texts of that language replaced for this country, e.g. Liberia says
  "Principal" where everyone else says "HT"). Keys are those of `strings/en.json`.
- `strings/<language>.json`: every text of the apps, one file per language, the same keys in each (a test checks it).
  Android generates its string resources from them (`android/app/build.gradle.kts`) and iOS bundles them
  (`ios/TnT/UI/Strings.swift`). To add a language, add its file and use its code as a country's `language`.
- `<country>/android/res/mipmap-*/ic_launcher.png`: the Android launcher icons. A country without its own icons uses
  the ones of `_default`.
- `<country>/signing.properties`: optional release signing for Android, never committed (see `android/README.md`).
- `default.json`: the country built when none is named. `_default` is the test and development config; in a
  standalone export it names the exported country.

The iOS icons are not stored here. `ios/configure.sh` renders the dashboard's favicon
(`client/countries/<country>/public/favicon.svg`) into a 1024 px app icon, and falls back to the generic TnT icon
(`ios/TnT/Assets.xcassets`) when a country has none.

Both apps share one version, `android/version.json`. Build with `./assemble <release|debug> <country> [--ios]`.
