import SwiftUI

@main
struct TnTApp: App {
	var body: some Scene {
		WindowGroup {
			Text(Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "")
		}
	}
}
