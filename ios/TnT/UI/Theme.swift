import SwiftUI

extension Color {
	/// `RRGGBB`, with or without a leading `#`.
	init(hex: String) {
		let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
		self.init(
			red: Double((value >> 16) & 0xFF) / 255,
			green: Double((value >> 8) & 0xFF) / 255,
			blue: Double(value & 0xFF) / 255
		)
	}
}

/// The colours of the country build. `main` is the primary colour of buttons, checkbox and titles.
enum Theme {
	static let main = Color(hex: AppConfig.current.colors["main"] ?? "0949FF")
}
