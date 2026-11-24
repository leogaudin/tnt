import SwiftUI

/// Shown while the camera or location is missing, with the way to get them.
struct PermissionsScreen: View {
	let model: AppModel

	var body: some View {
		VStack(spacing: 20) {
			Image(systemName: "camera.viewfinder")
				.font(.system(size: 56))
				.foregroundStyle(.secondary)
			Text(Strings.permissionsNeeded)
				.font(.title3)
				.multilineTextAlignment(.center)
			Button { model.permissionsButton() } label: {
				Text(Strings.checkPermissionsAgain).foregroundStyle(Theme.onTint)
			}
				.buttonStyle(.borderedProminent)
				.controlSize(.large)
				.tint(Theme.tint)
				.accessibilityIdentifier("check-permissions")
		}
		.padding(30)
		.frame(maxWidth: .infinity, maxHeight: .infinity)
		.background(Color(.systemGroupedBackground))
	}
}
