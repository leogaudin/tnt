import SwiftUI

struct ContentView: View {
	@Bindable var model: AppModel

	var body: some View {
		ZStack {
			if model.permissionsGranted {
				ScannerScreen(model: model)
					.sheet(item: $model.sendTarget) { SendScanSheet(model: model, boxId: $0.boxId) }
					.sheet(isPresented: $model.showOffline) { OfflineScansSheet(model: model) }
			} else {
				PermissionsScreen(model: model)
			}
			ToastOverlay(toast: model.toast)
		}
		// Over everything, the permissions screen included, until there is a login.
		.sheet(isPresented: Binding(get: { model.login == nil }, set: { _ in })) { LoginSheet(model: model) }
	}
}
