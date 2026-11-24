import SwiftUI

/// Shown while the camera or location is missing, with the way to get them.
struct PermissionsScreen: View {
	let model: AppModel

	var body: some View {
		VStack(spacing: 15) {
			Text(Strings.permissionsNeeded)
				.font(.system(size: 20))
				.multilineTextAlignment(.center)
			Button(Strings.checkPermissionsAgain) { model.permissionsButton() }
				.buttonStyle(.borderedProminent)
				.tint(Theme.main)
				.accessibilityIdentifier("check-permissions")
		}
		.padding(30)
		.frame(maxWidth: .infinity, maxHeight: .infinity)
		.background(Color(white: 0.96))
	}
}
