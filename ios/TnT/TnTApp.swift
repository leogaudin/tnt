import SwiftUI

@main
struct TnTApp: App {
	@State private var model = AppModel.make()
	@Environment(\.scenePhase) private var scenePhase

	var body: some Scene {
		WindowGroup {
			ContentView(model: model)
				.task { model.launch() }
		}
		.onChange(of: scenePhase) { _, phase in
			switch phase {
			case .active: model.becameActive()
			case .background: if !model.offlineScans.isEmpty { BackgroundSend.schedule() }
			default: break
			}
		}
		.backgroundTask(.appRefresh(BackgroundSend.identifier)) { [model] in
			await model.sendQueuedInBackground()
		}
	}
}

extension AppModel {
	static func make() -> AppModel {
		#if DEBUG
		if CommandLine.arguments.contains("-uiTesting") { return .uiTesting() }
		#endif
		return .live()
	}
}
