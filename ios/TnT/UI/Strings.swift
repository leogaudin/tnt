import Foundation

/// Every text of the app. The words come from `mobile/strings/<language>.json`, shared with the Android app, in the
/// language of the country build, then the country's own overrides on top (see AppConfig).
enum Strings {
	/// English is the reference: a text missing from another language falls back to it, so a new key never shows blank.
	static func table(language: String, overrides: [String: String], bundle: Bundle = .main) -> [String: String] {
		var table = load("en", bundle)
		if language != "en" { table.merge(load(language, bundle)) { _, translated in translated } }
		return table.merging(overrides) { _, override in override }
	}

	private static func load(_ language: String, _ bundle: Bundle) -> [String: String] {
		guard let url = bundle.url(forResource: language, withExtension: "json"),
			let data = try? Data(contentsOf: url),
			let table = try? JSONDecoder().decode([String: String].self, from: data)
		else { return [:] }
		return table
	}

	private static let current = table(language: AppConfig.current.language, overrides: AppConfig.current.stringOverrides)

	private static func text(_ key: String) -> String { current[key] ?? key }

	static var permissionsNeeded: String { text("permissionsNeeded") }
	static var checkPermissionsAgain: String { text("checkPermissionsAgain") }
	static var enterPhoneNumber: String { text("enterPhoneNumber") }
	static var login: String { text("login") }
	static var noCamera: String { text("noCamera") }
	// Attribution notice required by the additional terms in LICENSE (AGPL-3.0 section 7(b)). Do not remove or hide.
	static let poweredBy = "Powered by TnT (Track-and-Trace)"
	static let poweredByURL = "https://github.com/leogaudin/tnt"
	static func boxTitle(_ id: String) -> String { text("boxTitle").replacingOccurrences(of: "{id}", with: id) }
	static var location: String { text("location") }
	static var determining: String { text("determining") }
	static var retry: String { text("retry") }
	static var addComment: String { text("addComment") }
	static var markAsReceived: String { text("markAsReceived") }
	static var cancel: String { text("cancel") }
	static var send: String { text("send") }
	static var offlineScans: String { text("offlineScans") }
	static var noOfflineScans: String { text("noOfflineScans") }
	static var sendOfflineScans: String { text("sendOfflineScans") }
	static var close: String { text("close") }
	static var toastSuccess: String { text("toastSuccess") }
	static var toastSuccessText: String { text("toastSuccessText") }
	static var toastSavedOffline: String { text("toastSavedOffline") }
	static var toastSavedOfflineText: String { text("toastSavedOfflineText") }
	static var toastOfflineError: String { text("toastOfflineError") }
	static var toastOfflineErrorText: String { text("toastOfflineErrorText") }
	static var toastLocation: String { text("toastLocation") }
	static var flashlight: String { text("flashlight") }
	static var locationDenied: String { text("locationDenied") }
	static var locationUnavailable: String { text("locationUnavailable") }
	static var locationTimeout: String { text("locationTimeout") }
	static var locationOther: String { text("locationOther") }
}
