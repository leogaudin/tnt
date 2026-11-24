import Foundation

/// The two levels of accuracy CoreLocation is asked for, in this order: iOS has no separate network and GPS providers.
enum LocationStep: Sendable {
	/// About 100 m: Wi-Fi and cell towers, fast, and works indoors and on old phones.
	case coarse
	/// The best the phone can do: GPS, for when there is no network location to be had (e.g. a satellite connection).
	case precise
}

/// Why no position could be had. [message] says what the user can do about it.
enum LocationFailure: Equatable, Sendable {
	case denied
	case unavailable
	case timeout
	case other

	var message: String {
		switch self {
		case .denied: "Location access is denied. Allow it for this app in the phone settings."
		case .unavailable: "Location is unavailable. Turn on location in the phone settings."
		case .timeout: "The location search timed out. Move to an open area and retry."
		case .other: "Location could not be determined."
		}
	}
}

enum LocationResult: Equatable, Sendable {
	case fix(ScanLocation)
	case failure(LocationFailure)
}

/// Whether the app may use the position, as far as the phone says.
enum LocationPermission: Equatable, Sendable {
	/// Allowed, to full or reduced accuracy: reduced still gives fixes, and users who refuse the precise one must be
	/// able to work.
	case authorized
	case denied
	/// Location is switched off for the whole phone.
	case servicesOff
}

typealias Cancel = @MainActor () -> Void

/// One level of accuracy, one position request. May never call back (the bug that left RN on "Determining..." forever).
@MainActor
protocol LocationSource {
	/// - Returns: a function that cancels the request
	func request(_ step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel
}

@MainActor
protocol Scheduler {
	/// - Returns: a function that cancels the pending call
	func postDelayed(ms: Int64, _ action: @escaping @MainActor () -> Void) -> Cancel
}

/// Gets the phone's position: a coarse one first (fast, and reliable on old phones), then the best one when there is
/// none, e.g. on a satellite (Starlink) connection with no mobile network.
///
/// Every step has its own timeout, enforced here and not left to CoreLocation, so the answer always comes.
@MainActor
final class Locator {
	static let coarseTimeoutMs: Int64 = 5_000
	static let preciseTimeoutMs: Int64 = 10_000
	static let maxAgeMs: Int64 = 10_000

	private let source: LocationSource
	private let scheduler: Scheduler
	private let permission: () -> LocationPermission

	init(source: LocationSource, scheduler: Scheduler, permission: @escaping () -> LocationPermission) {
		self.source = source
		self.scheduler = scheduler
		self.permission = permission
	}

	/// - Returns: a function that cancels the search; no callback is made after it.
	func locate(_ onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
		let search = Search(source: source, scheduler: scheduler, onResult: onResult)
		switch permission() {
		case .authorized: search.start()
		case .denied: search.finish(.failure(.denied))
		case .servicesOff: search.finish(.failure(.unavailable))
		}
		return { search.cancel() }
	}

	/// One call of [locate]: its state is kept here so that a cancelled search can never report.
	@MainActor
	private final class Search {
		let source: LocationSource
		let scheduler: Scheduler
		let onResult: @MainActor (LocationResult) -> Void
		var done = false
		var cancelStep: Cancel = {}

		init(source: LocationSource, scheduler: Scheduler, onResult: @escaping @MainActor (LocationResult) -> Void) {
			self.source = source
			self.scheduler = scheduler
			self.onResult = onResult
		}

		func start() {
			cancelStep = attempt(.coarse, timeoutMs: Locator.coarseTimeoutMs) { [self] coarse in
				switch coarse {
				case .fix, .failure(.denied):
					finish(coarse)
				case .failure:
					cancelStep = attempt(.precise, timeoutMs: Locator.preciseTimeoutMs) { [self] in finish($0) }
				}
			}
		}

		func finish(_ result: LocationResult) {
			if done { return }
			done = true
			onResult(result)
		}

		func cancel() {
			done = true
			cancelStep()
		}

		/// One request that settles exactly once: with the source's answer, or with a timeout.
		func attempt(_ step: LocationStep, timeoutMs: Int64, _ next: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
			let attempt = Attempt(next: next)
			attempt.cancelTimer = scheduler.postDelayed(ms: timeoutMs) { attempt.settle(.failure(.timeout)) }
			attempt.cancelRequest = source.request(step, maxAgeMs: Locator.maxAgeMs) { attempt.settle($0) }
			return { attempt.cancel() }
		}
	}

	@MainActor
	private final class Attempt {
		var settled = false
		var cancelTimer: Cancel = {}
		var cancelRequest: Cancel = {}
		let next: @MainActor (LocationResult) -> Void

		init(next: @escaping @MainActor (LocationResult) -> Void) {
			self.next = next
		}

		func settle(_ result: LocationResult) {
			if settled { return }
			settled = true
			cancelTimer()
			cancelRequest()
			next(result)
		}

		func cancel() {
			settled = true
			cancelTimer()
			cancelRequest()
		}
	}
}
