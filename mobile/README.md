# Mobile country configs

One folder per country, read by both mobile apps: the Android app (`android/`) and the iOS app (`ios/`). It has the
same layout as `client/countries/` and `server/countries/`, which the tests and the standalone export rely on.

- `<country>/config.json`: `applicationId` (also the iOS bundle id), `appName`, `apiUrl` and `colors`
  (`lightest`, `light`, `main`, `dark`, `darkest`; `main` is the primary colour). Phones have the API URL built in, so
  it must never change for a country that is in the field.
- `<country>/android/res/mipmap-*/ic_launcher.png`: the Android launcher icons. A country without its own icons uses
  the ones of `_default`.
- `<country>/signing.properties`: optional release signing for Android, never committed (see `android/README.md`).
- `default.json`: the country built when none is named. `_default` is the test and development config; in a
  standalone export it names the exported country.

The iOS icons are not stored here. `ios/configure.sh` renders the dashboard's favicon
(`client/countries/<country>/public/favicon.svg`) into a 1024 px app icon, and falls back to the generic TnT icon
(`ios/TnT/Assets.xcassets`) when a country has none.

Both apps share one version, `android/version.json`. Build with `./assemble <release|debug> <country> [--ios]`.
