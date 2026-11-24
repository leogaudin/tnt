#if DEBUG
import Foundation

/// What the UI tests replace: the simulator has no camera, and the tests must not touch a server or the real location.
/// Switched on by the `-uiTesting` launch argument, only in debug builds.
///
/// Launch arguments: `-uiOffline` (every send fails), `-uiLoggedIn` (start with a login), `-uiNoLocation`
/// (location never answers), `-uiAutoScan` (reads a code a second after the start, for screenshots).
extension AppModel {
	static func uiTesting() -> AppModel {
		let args = CommandLine.arguments
		let defaults = UserDefaults(suiteName: "uitesting-\(UUID().uuidString)")!
		let store = LoginStore(defaults: defaults)
		if args.contains("-uiLoggedIn") { store.set("+231770123456") }
		let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
		try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
		let model = AppModel(
			api: StubAPI(result: args.contains("-uiOffline") ? .networkError : .sent),
			source: FixedLocationSource(answers: !args.contains("-uiNoLocation")),
			queue: ScanQueue(file: dir.appending(path: "queue.json")),
			loginStore: store,
			permissions: Permissions(forcedGranted: true)
		)
		model.simulatedCode = "tnt://test-box"
		if args.contains("-uiAutoScan") {
			Task {
				try? await Task.sleep(for: .seconds(1))
				model.onCode("tnt://11sG0fpGBwU")
			}
		}
		return model
	}
}

private struct StubAPI: ScanAPI {
	let result: SendResult
	func send(_ scan: Scan) async -> SendResult { result }
}

@MainActor
private struct FixedLocationSource: LocationSource {
	let answers: Bool

	func request(_ step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
		if answers {
			onResult(.fix(ScanLocation(latitude: 6.3, longitude: -10.8, altitude: 12, accuracy: 20, heading: 0, speed: 0, timestamp: 1_763_699_995_000, mocked: false)))
		}
		return {}
	}
}
#endif
