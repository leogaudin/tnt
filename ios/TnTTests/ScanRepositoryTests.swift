import Foundation
import Testing
@testable import TnT

final class FakeAPI: ScanAPI, @unchecked Sendable {
	private let lock = NSLock()
	private var sentKeys: [String] = []
	var answer: @Sendable (Scan) -> SendResult
	let delay: Duration

	init(delay: Duration = .zero, answer: @escaping @Sendable (Scan) -> SendResult) {
		self.answer = answer
		self.delay = delay
	}

	var sent: [String] { lock.withLock { sentKeys } }

	func send(_ scan: Scan) async -> SendResult {
		if delay != .zero { try? await Task.sleep(for: delay) }
		let result = answer(scan)
		if result == .sent { lock.withLock { sentKeys.append(scan.key) } }
		return result
	}
}

struct ScanRepositoryTests {
	private func repository(_ api: ScanAPI, queue: ScanQueue = ScanQueue(file: Fixtures.tempFile())) -> ScanRepository {
		ScanRepository(queue: queue, api: api)
	}

	@Test func aScanThatIsSentIsNotQueued() async {
		let repo = repository(FakeAPI { _ in .sent })
		#expect(await repo.submit(Fixtures.scan()))
		#expect(repo.queue.all().isEmpty)
	}

	@Test(arguments: [SendResult.networkError, .serverError(503), .rejected(404)])
	func aScanThatCannotBeSentIsQueuedWhateverTheReason(result: SendResult) async {
		let repo = repository(FakeAPI { _ in result })
		#expect(await !repo.submit(Fixtures.scan()))
		#expect(repo.queue.all().count == 1)
	}

	@Test func queuedScansAreSentOneByOneTheSentOnesLeaveTheFailedOnesStay() async {
		let repo = repository(FakeAPI { $0.boxId == "b" ? .networkError : .sent })
		repo.queue.addAll([Fixtures.scan("a", time: 1), Fixtures.scan("b", time: 2), Fixtures.scan("c", time: 3)])
		let report = await repo.sendQueued(includePermanentFailures: true)
		#expect(report == SendReport(sent: 2, failed: 1, retryable: 1))
		#expect(repo.queue.all().map(\.boxId) == ["b"])
	}

	@Test func theAutomaticPassFlagsARefusedScanAndNeverSendsItAgain() async {
		let api = FakeAPI { $0.boxId == "a" ? .rejected(404) : .sent }
		let repo = repository(api)
		repo.queue.addAll([Fixtures.scan("a", time: 1), Fixtures.scan("b", time: 2)])

		#expect(await repo.sendQueued(includePermanentFailures: false) == SendReport(sent: 1, failed: 1, retryable: 0))
		#expect(repo.queue.all().first?.failedPermanently == true)

		api.answer = { _ in .sent }
		#expect(await repo.sendQueued(includePermanentFailures: false) == SendReport())
		#expect(api.sent == ["b|2"])
		#expect(repo.queue.all().count == 1)
	}

	@Test func theManualPassStillTriesAScanTheServerRefusedBefore() async {
		let repo = repository(FakeAPI { _ in .sent })
		repo.queue.add(Fixtures.scan("a", time: 1).flagged())
		#expect(await repo.sendQueued(includePermanentFailures: true).sent == 1)
		#expect(repo.queue.all().isEmpty)
	}

	@Test func aServerProblemIsRetryableAndSoIsANetworkError() async {
		let repo = repository(FakeAPI { $0.boxId == "a" ? .serverError(500) : .networkError })
		repo.queue.addAll([Fixtures.scan("a", time: 1), Fixtures.scan("b", time: 2)])
		#expect(await repo.sendQueued(includePermanentFailures: false) == SendReport(sent: 0, failed: 2, retryable: 2))
		#expect(repo.queue.all().count == 2)
		#expect(!repo.queue.all().contains { $0.failedPermanently })
	}

	@Test func onSentIsCalledForEachSentScan() async {
		let repo = repository(FakeAPI { _ in .sent })
		repo.queue.addAll([Fixtures.scan("a", time: 1), Fixtures.scan("b", time: 2)])
		let calls = Counter()
		_ = await repo.sendQueued(includePermanentFailures: true) { calls.increment() }
		#expect(calls.value == 2)
	}

	@Test func theUIQueuingWhileAnotherPassSendsLosesNothing() async {
		let api = FakeAPI(delay: .milliseconds(1)) { _ in .sent }
		let repo = repository(api)
		repo.queue.addAll((0..<20).map { Fixtures.scan("old", time: Int64($0)) })
		async let pass = repo.sendQueued(includePermanentFailures: false)
		for i in 0..<20 {
			repo.queue.add(Fixtures.scan("new", time: Int64(i)))
			try? await Task.sleep(for: .milliseconds(1))
		}
		_ = await pass
		let left = repo.queue.all()
		#expect(!left.contains { $0.boxId == "old" })
		#expect(left.count { $0.boxId == "new" } + api.sent.count { $0.hasPrefix("new") } == 20)
	}

	@Test func theButtonAndAnAutomaticPassNeverSendTheSameScanTwice() async {
		let api = FakeAPI(delay: .milliseconds(1)) { _ in .sent }
		let repo = repository(api)
		repo.queue.addAll((0..<30).map { Fixtures.scan("x", time: Int64($0)) })
		async let manual = repo.sendQueued(includePermanentFailures: true)
		async let automatic = repo.sendQueued(includePermanentFailures: false)
		_ = await (manual, automatic)
		#expect(api.sent.count == 30)
		#expect(Set(api.sent).count == 30)
		#expect(repo.queue.all().isEmpty)
	}

	/// The list a pass works through is a snapshot: a scan another pass sent while this one was busy must be skipped.
	@Test func aScanSentByAnotherPassWhileThisOneWasBusyIsNotSentAgain() async {
		let slow = SlowFirstAPI(slowBox: "slow", delay: .milliseconds(150))
		let repo = repository(slow, queue: ScanQueue(file: Fixtures.tempFile()))
		repo.queue.addAll([Fixtures.scan("slow", time: 1), Fixtures.scan("x", time: 2)])
		async let busy = repo.sendQueued(includePermanentFailures: false)
		try? await Task.sleep(for: .milliseconds(30))
		_ = await repo.sendQueued(includePermanentFailures: false)
		_ = await busy
		#expect(slow.sent.filter { $0 == "x|2" }.count == 1)
	}

	@Test func aScanBeingSentIsNotSubmittedAgain() async {
		let api = FakeAPI(delay: .milliseconds(50)) { _ in .sent }
		let repo = repository(api)
		async let first = repo.submit(Fixtures.scan())
		try? await Task.sleep(for: .milliseconds(10))
		#expect(await !repo.submit(Fixtures.scan()))
		#expect(await first)
		#expect(api.sent.count == 1)
	}
}

extension Scan {
	func flagged() -> Scan {
		var copy = self
		copy.failedPermanently = true
		return copy
	}
}

/// Sends fine, but takes long over one box.
final class SlowFirstAPI: ScanAPI, @unchecked Sendable {
	private let lock = NSLock()
	private var keys: [String] = []
	let slowBox: String
	let delay: Duration

	init(slowBox: String, delay: Duration) {
		self.slowBox = slowBox
		self.delay = delay
	}

	var sent: [String] { lock.withLock { keys } }

	func send(_ scan: Scan) async -> SendResult {
		if scan.boxId == slowBox { try? await Task.sleep(for: delay) }
		lock.withLock { keys.append(scan.key) }
		return .sent
	}
}
