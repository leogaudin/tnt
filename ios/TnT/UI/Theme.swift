import SwiftUI
import UIKit

extension UIColor {
	/// `RRGGBB`, with or without a leading `#`.
	convenience init(hex: String) {
		let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
		self.init(
			red: CGFloat((value >> 16) & 0xFF) / 255,
			green: CGFloat((value >> 8) & 0xFF) / 255,
			blue: CGFloat(value & 0xFF) / 255,
			alpha: 1
		)
	}
}

/// The colours of the country build. A dark brand colour (Liberia's navy) is unreadable as text on the dark theme, so
/// the accent switches to the light variant of the same palette there.
enum Theme {
	private static func color(_ name: String, fallback: String) -> String { AppConfig.current.colors[name] ?? fallback }

	/// Buttons, links and switches.
	static let tint = Color(uiColor: UIColor { traits in
		UIColor(hex: traits.userInterfaceStyle == .dark ? color("light", fallback: "EBF0FE") : color("main", fallback: "0949FF"))
	})

	/// The text on a button filled with [tint].
	static let onTint = Color(uiColor: UIColor { traits in
		traits.userInterfaceStyle == .dark ? UIColor(hex: color("darkest", fallback: "001D6A")) : .white
	})
}
