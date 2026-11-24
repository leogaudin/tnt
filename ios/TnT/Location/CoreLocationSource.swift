import CoreLocation
import Foundation
import os

/// CoreLocation behind [LocationSource]. It only reports what CoreLocation says: the timeouts belong to [Locator].
@MainActor
struct CoreLocationSource: LocationSource {
	func request(_ step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
		let request = Request(step: step, maxAgeMs: maxAgeMs, onResult: onResult)
		request.start()
		return { request.cancel() }
	}

	static func isAuthorized(_ status: CLAuthorizationStatus) -> Bool {
		status == .authorizedWhenInUse || status == .authorizedAlways
	}

	@MainActor
	private final class Request: NSObject, CLLocationManagerDelegate {
		private static let log = Logger(subsystem: "com.tnt.scanner", category: "Location")
		private let step: LocationStep
		private let maxAgeMs: Int64
		private let onResult: @MainActor (LocationResult) -> Void
		private let manager = CLLocationManager()
		private var finished = false

		init(step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) {
			self.step = step
			self.maxAgeMs = maxAgeMs
			self.onResult = onResult
			super.init()
		}

		func start() {
			guard CoreLocationSource.isAuthorized(manager.authorizationStatus) else { return finish(.failure(.denied)) }
			manager.delegate = self
			manager.desiredAccuracy = step == .coarse ? kCLLocationAccuracyHundredMeters : kCLLocationAccuracyBest
			if let cached = manager.location, isFresh(cached) { return finish(.fix(ScanLocation(cached))) }
			Self.log.debug("Waiting for a \(String(describing: self.step)) fix")
			manager.startUpdatingLocation()
		}

		func cancel() {
			finished = true
			manager.stopUpdatingLocation()
			manager.delegate = nil
		}

		private func finish(_ result: LocationResult) {
			if finished { return }
			cancel()
			onResult(result)
		}

		/// Recent enough, and a real fix: CoreLocation reports a negative accuracy for an invalid one.
		private func isFresh(_ location: CLLocation) -> Bool {
			location.horizontalAccuracy >= 0 && -location.timestamp.timeIntervalSinceNow * 1000 <= Double(maxAgeMs)
		}

		nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
			MainActor.assumeIsolated {
				// The first update is often the one cached since the last use: wait for a fresh one.
				if let fix = locations.last(where: isFresh) { finish(.fix(ScanLocation(fix))) }
			}
		}

		nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
			MainActor.assumeIsolated {
				switch (error as? CLError)?.code {
				case .denied: finish(.failure(.denied))
				// Transient: CoreLocation keeps trying, and [Locator] ends the wait if nothing comes.
				case .locationUnknown: break
				default:
					Self.log.error("Location failed: \(error.localizedDescription)")
					finish(.failure(.other))
				}
			}
		}

		nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
			let status = manager.authorizationStatus
			MainActor.assumeIsolated {
				if status == .denied || status == .restricted { finish(.failure(.denied)) }
			}
		}
	}
}

extension ScanLocation {
	/// `course` and `speed` are -1 when invalid: sent as they are, as the React Native iOS app did.
	init(_ location: CLLocation) {
		self.init(
			latitude: location.coordinate.latitude,
			longitude: location.coordinate.longitude,
			altitude: location.altitude,
			accuracy: location.horizontalAccuracy,
			heading: location.course,
			speed: location.speed,
			timestamp: Int64(location.timestamp.timeIntervalSince1970 * 1000),
			mocked: location.sourceInformation?.isSimulatedBySoftware ?? false
		)
	}
}
