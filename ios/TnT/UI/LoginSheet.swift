import SwiftUI

/// Shown while nobody is logged in; it cannot be dismissed. The pre-filled number is Leo's choice.
struct LoginSheet: View {
	static let initialNumber = "+33742424242"

	let model: AppModel
	@State private var text: String

	init(model: AppModel) {
		self.model = model
		_text = State(initialValue: model.phones.format(Self.initialNumber))
	}

	private var normalized: String? { model.phones.normalize(text) }

	var body: some View {
		VStack(spacing: 15) {
			SheetTitle(Strings.enterPhoneNumber)
			HStack {
				Text(flag(model.phones.region(text))).font(.system(size: 28)).frame(minWidth: 48)
				TextField("", text: $text)
					.keyboardType(.phonePad)
					.textContentType(.telephoneNumber)
					.font(.system(size: 20))
					.accessibilityIdentifier("phone-field")
					.onChange(of: text) { _, new in
						let formatted = model.phones.format(new)
						if formatted != new { text = formatted }
					}
			}
			Button { if let number = normalized { model.setLogin(number) } } label: {
				Text(Strings.login).frame(maxWidth: .infinity)
			}
			.buttonStyle(.borderedProminent)
			.controlSize(.large)
			.tint(Theme.main)
			.disabled(normalized == nil)
			.accessibilityIdentifier("login-button")
		}
		.padding(20)
		.frame(maxHeight: .infinity, alignment: .top)
		.presentationDetents([.medium])
		.interactiveDismissDisabled()
	}

	private func flag(_ region: String?) -> String {
		guard let region, region.count == 2 else { return "🌐" }
		return String(region.unicodeScalars.compactMap { UnicodeScalar(127_397 + $0.value) }.map(Character.init))
	}
}

struct SheetTitle: View {
	let text: String
	init(_ text: String) { self.text = text }

	var body: some View {
		Text(text)
			.font(.system(size: 25, weight: .bold))
			.multilineTextAlignment(.center)
			.padding(.top, 10)
	}
}
