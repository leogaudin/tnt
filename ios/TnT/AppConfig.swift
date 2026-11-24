import Foundation

/// The country build's settings, written into Info.plist from `mobile/countries/<country>/config.json` (see configure.sh).
struct AppConfig: Sendable {
	let apiUrl: String
	let colors: [String: String]

	init(info: [String: Any]) {
		apiUrl = (info["TntApiUrl"] as? String) ?? ""
		colors = (info["TntColors"] as? [String: String]) ?? [:]
	}

	static let current = AppConfig(info: Bundle.main.infoDictionary ?? [:])
}
