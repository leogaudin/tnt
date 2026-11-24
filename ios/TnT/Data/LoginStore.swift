import Foundation

/// The operator's phone number, `+` and digits only. There is no logout.
struct LoginStore: @unchecked Sendable {
	static let key = "user_number"
	var defaults: UserDefaults = .standard

	func get() -> String? {
		defaults.string(forKey: Self.key).flatMap { $0.isEmpty ? nil : $0 }
	}

	func set(_ number: String) {
		defaults.set(number, forKey: Self.key)
	}
}
