import Testing
@testable import TnT

@MainActor
struct LocatorTests {
	private let fix = ScanLocation(latitude: 6.3, longitude: -10.8, altitude: 0, accuracy: 20, heading: 0, speed: 0, timestamp: 1000, mocked: false)

	/// Time only moves when the test says so.
	private final class FakeScheduler: Scheduler {
		private final class Pending {
			let at: Int64
			let action: @MainActor () -> Void
			var cancelled = false
			init(at: Int64, action: @escaping @MainActor () -> Void) { self.at = at; self.action = action }
		}
		private var pending: [Pending] = []
		var now: Int64 = 0

		func postDelayed(ms: Int64, _ action: @escaping @MainActor () -> Void) -> Cancel {
			let p = Pending(at: now + ms, action: action)
			pending.append(p)
			return { p.cancelled = true }
		}

		func advance(_ ms: Int64) {
			let target = now + ms
			while let next = pending.filter({ !$0.cancelled && $0.at <= target }).min(by: { $0.at < $1.at }) {
				pending.removeAll { $0 === next }
				now = next.at
				next.action()
			}
			now = target
		}
	}

	/// Answers per step: immediately with a result, or never.
	private final class FakeSource: LocationSource {
		let answers: [LocationStep: LocationResult?]
		var requested: [LocationStep] = []
		var cancelled = 0
		init(_ answers: [LocationStep: LocationResult?]) { self.answers = answers }

		func request(_ step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
			requested.append(step)
			if let answer = answers[step] ?? nil { onResult(answer) }
			return { [self] in cancelled += 1 }
		}
	}

	private func fail(_ reason: LocationFailure) -> LocationResult { .failure(reason) }

	/// Runs a search, lets [block] move the time, and returns what was reported.
	private func run(_ source: LocationSource, _ permission: LocationPermission = .authorized, scheduler: FakeScheduler = FakeScheduler(), _ block: (FakeScheduler, () -> LocationResult?) -> Void = { _, _ in }) -> LocationResult? {
		var result: LocationResult?
		_ = Locator(source: source, scheduler: scheduler) { permission }.locate { result = $0 }
		block(scheduler) { result }
		return result
	}

	@Test func theCoarseFixIsUsedWhenThereIsOneThePreciseOneIsNotAsked() {
		let source = FakeSource([.coarse: .fix(fix)])
		#expect(run(source) == .fix(fix))
		#expect(source.requested == [.coarse])
	}

	@Test func coarseNeverAnswersTheFiveSecondTimeoutHandsOverToPrecise() {
		let source = FakeSource([.coarse: nil, .precise: .fix(fix)])
		let result = run(source) { scheduler, current in
			scheduler.advance(4_999)
			#expect(current() == nil)
			scheduler.advance(1)
		}
		#expect(result == .fix(fix))
		#expect(source.requested == [.coarse, .precise])
		#expect(source.cancelled == 1)
	}

	@Test func coarseFailsRightAwayPreciseGetsItsPosition() {
		let source = FakeSource([.coarse: fail(.unavailable), .precise: .fix(fix)])
		#expect(run(source) == .fix(fix))
	}

	@Test func coarseFailsAndPreciseNeverAnswersItEndsWithATimeout15SecondsAfterTheStart() {
		let source = FakeSource([.coarse: nil, .precise: nil])
		let result = run(source) { scheduler, current in
			scheduler.advance(14_999)
			#expect(current() == nil)
			scheduler.advance(1)
		}
		#expect(result == fail(.timeout))
	}

	@Test func coarseFailsAndPreciseSaysUnavailableThatMessageIsReported() {
		let source = FakeSource([.coarse: fail(.timeout), .precise: fail(.unavailable)])
		#expect(run(source) == fail(.unavailable))
	}

	@Test func denialByTheSystemStopsEverythingPreciseIsNotTried() {
		let source = FakeSource([.coarse: fail(.denied), .precise: .fix(fix)])
		#expect(run(source) == fail(.denied))
		#expect(source.requested == [.coarse])
	}

	@Test func noPermissionAtAllIsDeniedWithoutAskingAnySource() {
		let source = FakeSource([:])
		#expect(run(source, .denied) == fail(.denied))
		#expect(source.requested.isEmpty)
	}

	@Test func locationSwitchedOffForThePhoneIsUnavailableWithoutAskingAnySource() {
		let source = FakeSource([:])
		#expect(run(source, .servicesOff) == fail(.unavailable))
		#expect(source.requested.isEmpty)
	}

	@Test func aLateAnswerAfterTheTimeoutIsIgnored() {
		final class Capturing: LocationSource {
			var callbacks: [@MainActor (LocationResult) -> Void] = []
			func request(_ step: LocationStep, maxAgeMs: Int64, onResult: @escaping @MainActor (LocationResult) -> Void) -> Cancel {
				callbacks.append(onResult)
				return {}
			}
		}
		let source = Capturing()
		let scheduler = FakeScheduler()
		var results: [LocationResult] = []
		_ = Locator(source: source, scheduler: scheduler) { .authorized }.locate { results.append($0) }
		scheduler.advance(15_000)
		source.callbacks[0](.fix(fix))
		source.callbacks[1](.fix(fix))
		#expect(results == [fail(.timeout)])
	}

	@Test func cancellingStopsTheSearchAndNothingIsReported() {
		let source = FakeSource([.coarse: nil])
		let scheduler = FakeScheduler()
		var result: LocationResult?
		let cancel = Locator(source: source, scheduler: scheduler) { .authorized }.locate { result = $0 }
		cancel()
		scheduler.advance(60_000)
		#expect(result == nil)
		#expect(source.requested == [.coarse])
	}

	@Test func theMessagesAreTheOnesOfTheOtherApps() {
		#expect(LocationFailure.denied.message == "Location access is denied. Allow it for this app in the phone settings.")
		#expect(LocationFailure.unavailable.message == "Location is unavailable. Turn on location in the phone settings.")
		#expect(LocationFailure.timeout.message == "The location search timed out. Move to an open area and retry.")
		#expect(LocationFailure.other.message == "Location could not be determined.")
	}
}
