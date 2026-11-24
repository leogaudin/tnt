# iOS app

Native Swift app (SwiftUI, iOS 17+). The only dependency is PhoneNumberKit, pinned in the Swift package settings.

- `TnT/`: the app. `Data/` (scan, queue, API, repository), `Location/`, `Phone/`, `Scanner/` (AVFoundation),
  `UI/` (screens). `UITestSupport.swift` only exists in debug builds.
- `TnTTests/`: unit tests (Swift Testing). `TnTUITests/`: UI tests, with the camera, server and location replaced.
- `Config/`: `Base.xcconfig` and `Info.plist` are committed; `Country.xcconfig` and the country icon are generated.

## Build

    ./configure.sh <country>              # writes Config/Country.xcconfig and the icon from mobile/countries/<country>
    ../assemble debug <country> --ios     # simulator build, in dist/mobile
    ../assemble release <country> --ios   # .xcarchive in dist/mobile (nothing is exported or uploaded)

Open `TnT.xcodeproj` after `./configure.sh`: without it the app builds as `_default` with the generic icon.
Signing is automatic with team `R32B9PWM4R`; each country's bundle id is registered the first time it is built for a phone.

## Tests

    xcodebuild test -project TnT.xcodeproj -scheme TnT -only-testing:TnTTests \
      -destination 'platform=iOS Simulator,name=iPhone 17' CODE_SIGNING_ALLOWED=NO

The UI tests take a few minutes. Launch arguments for debug builds: `-uiTesting`, `-uiLoggedIn`, `-uiOffline`,
`-uiNoLocation`, `-uiAutoScan` (see `UITestSupport.swift`).

## On a phone

`xcrun devicectl device capture screenshot --device <udid> --destination shot.png` takes a screenshot; arguments for
the launched app go after `--`. The phone must be unlocked. iOS decides when the background refresh task runs: force it
from Xcode's debugger with `_simulateLaunchForTaskWithIdentifier:` on `<bundle id>.send-queue`.
