import Foundation
import PhoneNumberKit

/// The login. The dashboard groups scans by the stored string, so its format is fixed: `+` followed by the digits
/// only (e.g. `+231770123456`), exactly what the React Native phone input produced.
final class PhoneNumbers {
	private let utility = PhoneNumberUtility()

	/// The value to store and send as `operatorId`, or nil if [input] is not a valid international number.
	func normalize(_ input: String) -> String? {
		let digits = input.filter(\.isASCIIDigit)
		if digits.isEmpty { return nil }
		let value = "+\(digits)"
		return utility.isValidPhoneNumber(value, withRegion: "FR") ? value : nil
	}

	/// The digits of [input] formatted as an international number as they are typed (`+231 77 123`). Without trailing
	/// separators: the formatter ends `+33` with a space, which a backspace would remove and the field add back, so
	/// nothing before it could ever be deleted.
	func format(_ input: String) -> String {
		let digits = input.filter(\.isASCIIDigit)
		if digits.isEmpty { return "" }
		let formatted = PartialFormatter(utility: utility, defaultRegion: "FR", withPrefix: true).formatPartial("+\(digits)")
		guard let last = formatted.lastIndex(where: \.isASCIIDigit) else { return "" }
		return String(formatted[...last])
	}

	/// The region of a typed number (`LR`), for the flag next to the field.
	func region(_ input: String) -> String? {
		let digits = input.filter(\.isASCIIDigit)
		guard !digits.isEmpty, let number = try? utility.parse("+\(digits)", withRegion: "FR", ignoreType: true) else { return nil }
		return utility.getRegionCode(of: number)
	}
}

private extension Character {
	var isASCIIDigit: Bool { ("0"..."9").contains(self) }
}
