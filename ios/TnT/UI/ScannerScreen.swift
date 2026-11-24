import SwiftUI

/// The camera with its two buttons and the attribution notice.
struct ScannerScreen: View {
	let model: AppModel
	@State private var camera = CameraController()
	@State private var torchOn = false
	@Environment(\.scenePhase) private var scenePhase

	var body: some View {
		ZStack {
			if camera.isAvailable {
				CameraPreview(session: camera.session).ignoresSafeArea()
			} else {
				Color(.systemBackground).ignoresSafeArea()
				Text(Strings.noCamera)
					.multilineTextAlignment(.center)
					.padding(20)
			}
			VStack {
				topBar
				Spacer()
				poweredBy
			}
		}
		.onAppear {
			camera.onCode = { [model] in model.onCode($0) }
			camera.start()
		}
		.onDisappear { camera.stop() }
		.onChange(of: scenePhase) { _, phase in
			if phase == .active { camera.start() } else { camera.stop(); torchOn = false }
		}
	}

	private var topBar: some View {
		HStack {
			RoundButton(icon: "icloud.slash", label: Strings.offlineScans, id: "offline-button") { model.showOffline = true }
			Spacer()
			if let code = model.simulatedCode {
				Button { model.onCode(code) } label: { Text("Simulate scan").foregroundStyle(Theme.onTint) }
					.buttonStyle(.borderedProminent)
					.tint(Theme.tint)
					.accessibilityIdentifier("simulate-scan")
			}
			Spacer()
			if camera.hasTorch {
				RoundButton(icon: torchOn ? "flashlight.on.fill" : "flashlight.off.fill", label: Strings.flashlight, id: "torch-button") {
					torchOn.toggle()
					camera.setTorch(torchOn)
				}
			}
		}
		.padding(.horizontal, 30)
		.padding(.top, 30)
	}

	/// Attribution notice required by the additional terms in LICENSE (AGPL-3.0 section 7(b)). Do not remove or hide.
	private var poweredBy: some View {
		Link(Strings.poweredBy, destination: URL(string: Strings.poweredByURL)!)
			.font(.system(size: 12))
			.foregroundStyle(camera.isAvailable ? Color.white : Color.primary)
			.shadow(color: .black, radius: 4)
			.padding(12)
	}
}

private struct RoundButton: View {
	let icon: String
	let label: String
	let id: String
	let action: () -> Void

	var body: some View {
		Button(action: action) {
			Image(systemName: icon)
				.font(.system(size: 18))
				.foregroundStyle(.white)
				.frame(width: 44, height: 44)
				.background(.ultraThinMaterial, in: Circle())
				.environment(\.colorScheme, .dark)
		}
		.accessibilityLabel(label)
		.accessibilityIdentifier(id)
	}
}
