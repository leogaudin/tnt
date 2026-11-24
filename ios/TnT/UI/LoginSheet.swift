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
		NavigationStack {
			Form {
				Section {
					HStack(spacing: 12) {
						Text(flag(model.phones.region(text))).font(.title)
						TextField("", text: $text)
							.keyboardType(.phonePad)
							.textContentType(.telephoneNumber)
							.font(.title3)
							.accessibilityIdentifier("phone-field")
							.onChange(of: text) { _, new in
								let formatted = model.phones.format(new)
								if formatted != new { text = formatted }
							}
					}
				}
				Section {
					Button { if let number = normalized { model.setLogin(number) } } label: {
						Text(Strings.login).frame(maxWidth: .infinity).foregroundStyle(Theme.onTint)
					}
					.buttonStyle(.borderedProminent)
					.controlSize(.large)
					.disabled(normalized == nil)
					.accessibilityIdentifier("login-button")
					.listRowInsets(EdgeInsets())
					.listRowBackground(Color.clear)
				}
			}
			.navigationTitle(Strings.enterPhoneNumber)
			.navigationBarTitleDisplayMode(.inline)
		}
		.tint(Theme.tint)
		.presentationDetents([.medium])
		.interactiveDismissDisabled()
	}

	private func flag(_ region: String?) -> String {
		guard let region, region.count == 2 else { return "🌐" }
		return String(region.unicodeScalars.compactMap { UnicodeScalar(127_397 + $0.value) }.map(Character.init))
	}
}
