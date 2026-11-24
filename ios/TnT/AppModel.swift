import BackgroundTasks
import Foundation
import Network
import Observation
import os

struct Toast: Equatable, Identifiable {
	let id = UUID()
	let title: String
	let text: String
}

/// What the screens show and do. One place, so that every flow of the app can be walked through in a test.
@MainActor
@Observable
final class AppModel {
	struct SendTarget: Identifiable {
		let boxId: String
		let id = UUID()
	}

	var login: String?
	var permissionsGranted = false
	var canAskPermissions = false
	var sendTarget: SendTarget?
	var showOffline = false
	var offlineScans: [Scan] = []
	var toast: Toast?

	@ObservationIgnored let queue: ScanQueue
	@ObservationIgnored let repository: ScanRepository
	@ObservationIgnored let locator: Locator
	@ObservationIgnored let phones = PhoneNumbers()
	@ObservationIgnored let permissions: Permissions
	@ObservationIgnored private let loginStore: LoginStore
	@ObservationIgnored private var gate = CodeGate(now: { Int64(ProcessInfo.processInfo.systemUptime * 1000) })
	@ObservationIgnored private var queueToken: UUID?
	@ObservationIgnored private var network: NWPathMonitor?
	/// Only set by the UI tests: shows a button that reads a code, since the simulator has no camera.
	@ObservationIgnored var simulatedCode: String?

	init(api: ScanAPI, source: LocationSource, queue: ScanQueue, loginStore: LoginStore, permissions: Permissions = Permissions(), scheduler: Scheduler = MainScheduler()) {
		self.queue = queue
		self.repository = ScanRepository(queue: queue, api: api)
		self.loginStore = loginStore
		self.permissions = permissions
		self.login = loginStore.get()
		self.locator = Locator(source: source, scheduler: scheduler) { permissions.locationPermission }
		permissions.onChange = { [unowned self] in permissionsChanged() }
		permissionsChanged()
		offlineScans = queue.all()
		queueToken = queue.addListener { [weak self] in
			Task { @MainActor in self?.offlineScans = self?.queue.all() ?? [] }
		}
	}

	static func live() -> AppModel {
		AppModel(api: HTTPScanAPI(apiUrl: AppConfig.current.apiUrl), source: CoreLocationSource(), queue: .standard(), loginStore: LoginStore())
	}

	// MARK: Permissions

	private func permissionsChanged() {
		permissionsGranted = permissions.granted
		canAskPermissions = permissions.canAsk
	}

	/// Asks what can still be asked; once the system will not show its prompt any more, opens the Settings page.
	func permissionsButton() {
		if permissions.canAsk {
			Task { await permissions.request() }
		} else {
			permissions.openSettings()
		}
	}

	func launch() {
		permissions.refresh()
		if permissions.canAsk { Task { await permissions.request() } }
		startWatchingNetwork()
		sendQueuedAutomatically()
	}

	func becameActive() {
		// Back from the Settings page, where the permissions may have changed.
		permissions.refresh()
		sendQueuedAutomatically()
	}

	// MARK: Login

	func setLogin(_ number: String) {
		loginStore.set(number)
		login = number
	}

	// MARK: Scanning

	/// A code read by the camera. Only `tnt://` codes outside the quiet time count, and not while a sheet is open.
	func onCode(_ content: String) {
		guard login != nil else { return }
		guard let boxId = gate.accept(content, dialogOpen: sendTarget != nil) else { return }
		sendTarget = SendTarget(boxId: boxId)
	}

	func submit(_ scan: Scan) {
		Task {
			let sent = await repository.submit(scan)
			if sent {
				show(Strings.toastSuccess, Strings.toastSuccessText)
			} else {
				show(Strings.toastSavedOffline, Strings.toastSavedOfflineText)
				BackgroundSend.schedule()
			}
		}
	}

	/// The manual button: tries everything, including what the server refused before.
	func sendOfflineScans() {
		Task {
			let report = await repository.sendQueued(includePermanentFailures: true) {
				Task { @MainActor in self.show(Strings.toastSuccess, Strings.toastSuccessText) }
			}
			if report.failed > 0 { show(Strings.toastOfflineError, Strings.toastOfflineErrorText) }
		}
	}

	// MARK: Automatic sending

	/// Silent: the app may be closed, and the manual flow stays as it is. A scan the server refused is left alone.
	func sendQueuedAutomatically() {
		Task {
			let report = await repository.sendQueued(includePermanentFailures: false)
			if report.retryable > 0 { BackgroundSend.schedule() }
		}
	}

	/// For the iOS background task: the same pass, awaited.
	func sendQueuedInBackground() async {
		let report = await repository.sendQueued(includePermanentFailures: false)
		if report.retryable > 0 { BackgroundSend.schedule() }
	}

	private func startWatchingNetwork() {
		guard network == nil else { return }
		let monitor = NWPathMonitor()
		monitor.pathUpdateHandler = { [weak self] path in
			guard path.status == .satisfied else { return }
			Task { @MainActor in self?.sendQueuedAutomatically() }
		}
		monitor.start(queue: DispatchQueue(label: "com.tnt.scanner.network"))
		network = monitor
	}

	// MARK: Toasts

	func show(_ title: String, _ text: String) {
		let toast = Toast(title: title, text: text)
		self.toast = toast
		Task {
			try? await Task.sleep(for: .seconds(3))
			if self.toast == toast { self.toast = nil }
		}
	}
}

/// iOS decides when this runs, often hours later and never after a force-quit: it is a bonus on top of the sends
/// the app makes itself at launch, on return to the foreground and when the network comes back.
enum BackgroundSend {
	static var identifier: String { (Bundle.main.bundleIdentifier ?? "com.tnt.scanner") + ".send-queue" }

	static func schedule() {
		let request = BGAppRefreshTaskRequest(identifier: identifier)
		request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
		do {
			try BGTaskScheduler.shared.submit(request)
		} catch {
			// Expected in the simulator, and when the user turned Background App Refresh off: nothing else to do.
			Logger(subsystem: "com.tnt.scanner", category: "BackgroundSend").notice("Not scheduled: \(error.localizedDescription)")
		}
	}
}
