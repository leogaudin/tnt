import Foundation
import Testing
@testable import TnT

struct ScanQueueTests {
	@Test func emptyWhenThereIsNoFile() {
		#expect(ScanQueue(file: Fixtures.tempFile()).all().isEmpty)
	}

	@Test func scansAreKeptAcrossInstances() {
		let file = Fixtures.tempFile()
		let queue = ScanQueue(file: file)
		queue.add(Fixtures.scan("a", time: 1))
		queue.add(Fixtures.scan("b", time: 2))
		#expect(ScanQueue(file: file).all().map(\.boxId) == ["a", "b"])
	}

	@Test func theSameBoxAtTheSameTimeIsQueuedOnce() {
		let queue = ScanQueue(file: Fixtures.tempFile())
		#expect(queue.add(Fixtures.scan("a", time: 1)))
		#expect(!queue.add(Fixtures.scan("a", time: 1)))
		#expect(queue.add(Fixtures.scan("a", time: 2)))
		#expect(queue.all().count == 2)
	}

	@Test func duplicatesAlreadyInTheFileAreDroppedOnLoad() throws {
		let file = Fixtures.tempFile()
		try JSONEncoder().encode([Fixtures.scan("a", time: 1), Fixtures.scan("a", time: 1)]).write(to: file)
		#expect(ScanQueue(file: file).all().count == 1)
	}

	@Test func removingKeepsTheOthersAndPersists() {
		let file = Fixtures.tempFile()
		let queue = ScanQueue(file: file)
		queue.addAll([Fixtures.scan("a", time: 1), Fixtures.scan("b", time: 2), Fixtures.scan("c", time: 3)])
		queue.remove(["a|1", "c|3"])
		#expect(ScanQueue(file: file).all().map(\.boxId) == ["b"])
	}

	@Test func aCorruptFileIsMovedAsideNotDeletedAndTheQueueStartsEmpty() throws {
		let file = Fixtures.tempFile()
		try Data("[{\"boxId\": \"a\", ".utf8).write(to: file)
		#expect(ScanQueue(file: file).all().isEmpty)
		let aside = try FileManager.default.contentsOfDirectory(at: file.deletingLastPathComponent(), includingPropertiesForKeys: nil)
			.filter { $0.lastPathComponent.hasPrefix("queue.json.corrupt-") }
		#expect(aside.count == 1)
		#expect(try String(contentsOf: aside[0], encoding: .utf8) == "[{\"boxId\": \"a\", ")
	}

	@Test func aQueueThatCannotBeReadIsStillUsable() throws {
		let file = Fixtures.tempFile()
		try Data("not json".utf8).write(to: file)
		let queue = ScanQueue(file: file)
		queue.add(Fixtures.scan("a", time: 1))
		#expect(ScanQueue(file: file).all().map(\.boxId) == ["a"])
	}

	@Test func markingAScanAsPermanentlyFailedPersists() {
		let file = Fixtures.tempFile()
		let queue = ScanQueue(file: file)
		queue.add(Fixtures.scan("a", time: 1))
		#expect(queue.markFailedPermanently("a|1"))
		#expect(!queue.markFailedPermanently("a|1"))
		#expect(ScanQueue(file: file).all().first?.failedPermanently == true)
	}

	@Test func listenersHearAboutChangesNotAboutNoOps() {
		let queue = ScanQueue(file: Fixtures.tempFile())
		let calls = Counter()
		let token = queue.addListener { calls.increment() }
		queue.add(Fixtures.scan("a", time: 1))
		queue.add(Fixtures.scan("a", time: 1))
		queue.remove(["zzz"])
		queue.remove(["a|1"])
		#expect(calls.value == 2)
		queue.removeListener(token)
		queue.add(Fixtures.scan("b", time: 2))
		#expect(calls.value == 2)
	}

	@Test func concurrentWritersLoseNothing() async {
		let file = Fixtures.tempFile()
		let queue = ScanQueue(file: file)
		await withTaskGroup(of: Void.self) { group in
			for t in 0..<8 {
				group.addTask { for i in 0..<25 { queue.add(Fixtures.scan("t\(t)", time: Int64(i))) } }
			}
		}
		#expect(queue.all().count == 200)
		#expect(ScanQueue(file: file).all().count == 200)
	}
}

final class Counter: @unchecked Sendable {
	private let lock = NSLock()
	private var count = 0
	func increment() { lock.withLock { count += 1 } }
	var value: Int { lock.withLock { count } }
}
