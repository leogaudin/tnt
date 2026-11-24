import AVFoundation
import CoreLocation
import UIKit

/// Camera and location permissions. iOS asks once: after a refusal only the Settings page can change the answer.
@MainActor
final class Permissions: NSObject, CLLocationManagerDelegate {
	private let manager = CLLocationManager()
	private var waitingForLocation: CheckedContinuation<Void, Never>?
	private(set) var camera = AVAuthorizationStatus.notDetermined
	private(set) var location = CLAuthorizationStatus.notDetermined
	/// Whether location is switched on for the whole phone. Asked off the main thread, as Apple requires.
	private(set) var servicesEnabled = true
	var onChange: () -> Void = {}

	#if DEBUG
	/// For the UI tests: everything is allowed, and nothing is asked.
	private var forcedGranted = false

	convenience init(forcedGranted: Bool) {
		self.init()
		self.forcedGranted = forcedGranted
		refresh()
	}
	#endif

	override init() {
		super.init()
		manager.delegate = self
		refresh()
	}

	/// Location counts as granted to full or reduced accuracy: users who refuse the precise one must be able to work.
	var granted: Bool {
		#if DEBUG
		if forcedGranted { return true }
		#endif
		return camera == .authorized && (location == .authorizedWhenInUse || location == .authorizedAlways)
	}

	/// Whether the system will still show its prompt for something.
	var canAsk: Bool {
		#if DEBUG
		if forcedGranted { return false }
		#endif
		return camera == .notDetermined || location == .notDetermined
	}

	var locationPermission: LocationPermission {
		#if DEBUG
		if forcedGranted { return .authorized }
		#endif
		return switch location {
		case .authorizedWhenInUse, .authorizedAlways: .authorized
		default: servicesEnabled ? .denied : .servicesOff
		}
	}

	func refresh() {
		camera = AVCaptureDevice.authorizationStatus(for: .video)
		location = manager.authorizationStatus
		onChange()
		Task {
			let enabled = await Task.detached { CLLocationManager.locationServicesEnabled() }.value
			if enabled != servicesEnabled {
				servicesEnabled = enabled
				onChange()
			}
		}
	}

	/// The prompts, one after the other: camera, then location.
	func request() async {
		if camera == .notDetermined { _ = await AVCaptureDevice.requestAccess(for: .video) }
		refresh()
		if location == .notDetermined {
			await withCheckedContinuation { continuation in
				waitingForLocation = continuation
				manager.requestWhenInUseAuthorization()
			}
		}
		refresh()
	}

	func openSettings() {
		if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
	}

	nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
		let status = manager.authorizationStatus
		MainActor.assumeIsolated {
			location = status
			if status != .notDetermined {
				waitingForLocation?.resume()
				waitingForLocation = nil
			}
			onChange()
		}
	}
}
