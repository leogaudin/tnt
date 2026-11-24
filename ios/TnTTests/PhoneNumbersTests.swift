import Testing
@testable import TnT

struct PhoneNumbersTests {
	private let phones = PhoneNumbers()

	@Test(arguments: [
		("LR", "+231 77 123 4567"),
		("MW", "+265 991 234 567"),
		("CF", "+236 70 01 23 45"),
		("GW", "+245 955 123 456"),
		("MR", "+222 22 12 34 56"),
		("NG", "+234 803 123 4567"),
		("RW", "+250 788 123 456"),
		("SN", "+221 77 123 45 67"),
		("SL", "+232 76 123456"),
		("FR", "+33 7 42 42 42 42"),
	])
	func aValidMobileNumberOfEachCountryIsStoredAsPlusAndDigits(country: String, formatted: String) {
		#expect(phones.normalize(formatted) == "+" + formatted.filter(\.isNumber), "\(country)")
	}

	@Test func theDefaultLoginOfTheLoginScreenIsValid() {
		#expect(phones.normalize("+33742424242") == "+33742424242")
	}

	@Test func formattingCharactersAreDropped() {
		#expect(phones.normalize("+33 (7) 42-42.42 42") == "+33742424242")
	}

	@Test func invalidNumbersAreRefused() {
		for input in ["", "+", "+33", "+231 123", "+33 7 42 42", "+999 123456789"] {
			#expect(phones.normalize(input) == nil, "\(input)")
		}
	}

	@Test func typedDigitsAreFormattedAsAnInternationalNumber() {
		#expect(phones.format("23177123") == "+231 77 123")
		#expect(phones.format("+33742424242") == "+33 7 42 42 42 42")
		#expect(phones.format("") == "")
		#expect(phones.format("+") == "")
	}

	@Test func aDialCodeHasNoTrailingSpaceSoABackspaceCanGoPastIt() {
		#expect(phones.format("33") == "+33")
		#expect(phones.format("3") == "+3")
		// Backspace on "+33" leaves "+3", then "+", then nothing.
		#expect(phones.format("+3") == "+3")
		#expect(phones.format("+") == "")
	}

	@Test func noPrefixOfATypedNumberEndsWithASeparator() {
		for number in ["231771234567", "33742424242", "2348031234567", "250788123456", "221771234567"] {
			for length in 1...number.count {
				let formatted = phones.format(String(number.prefix(length)))
				#expect(formatted.last?.isNumber == true, "\(formatted)")
			}
		}
	}

	@Test func theRegionOfATypedNumberIsKnownForTheFlag() {
		#expect(phones.region("+231771234567") == "LR")
		#expect(phones.region("+33742424242") == "FR")
		#expect(phones.region("") == nil)
	}
}
