import Foundation

/// The country build's settings, written into Info.plist from `mobile/countries/<country>/config.json` (see configure.sh).
struct AppConfig: Sendable {
	let apiUrl: String
	let colors: [String: String]
	/// The one language the app is written in.
	let language: String
	/// Country-specific texts that replace the ones of `mobile/strings/<language>.json`.
	let stringOverrides: [String: String]

	init(info: [String: Any]) {
		apiUrl = (info["TntApiUrl"] as? String) ?? ""
		colors = (info["TntColors"] as? [String: String]) ?? [:]
		language = (info["TntLanguage"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "en"
		stringOverrides = ((info["TntStringOverrides"] as? String)?.data(using: .utf8))
			.flatMap { try? JSONDecoder().decode([String: String].self, from: $0) } ?? [:]
	}

	static let current = AppConfig(info: Bundle.main.infoDictionary ?? [:])
}
