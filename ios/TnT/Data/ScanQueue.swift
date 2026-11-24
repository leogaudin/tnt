import Foundation
import os

/// The scans waiting to be sent, kept in one JSON file. Every write replaces the file atomically, so a crash or a
/// killed app leaves either the old or the new queue, never half of one. Thread-safe: the UI and the senders share it.
final class ScanQueue: @unchecked Sendable {
	private let file: URL
	private let lock = NSLock()
	private var scans: [Scan]?
	private var listeners: [UUID: @Sendable () -> Void] = [:]
	private static let log = Logger(subsystem: "com.tnt.scanner", category: "ScanQueue")

	init(file: URL) {
		self.file = file
	}

	/// The queue of the app: in Application Support, which is not shown to the user and is backed up.
	static func standard() -> ScanQueue {
		let directory = URL.applicationSupportDirectory
		try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
		return ScanQueue(file: directory.appending(path: "offline_scans.json"))
	}

	/// Calls [listener] after every change. Returns what to give to [removeListener].
	func addListener(_ listener: @escaping @Sendable () -> Void) -> UUID {
		lock.withLock {
			let token = UUID()
			listeners[token] = listener
			return token
		}
	}

	func removeListener(_ token: UUID) {
		lock.withLock { listeners[token] = nil }
	}

	func all() -> [Scan] { lock.withLock { loaded() } }

	func contains(_ key: String) -> Bool { lock.withLock { loaded().contains { $0.key == key } } }

	/// Adds scans, ignoring those already queued (same box and time). Returns whether anything was added.
	@discardableResult
	func addAll(_ added: [Scan]) -> Bool {
		update { current in
			var known = Set(current.map(\.key))
			current += added.filter { known.insert($0.key).inserted }
		}
	}

	@discardableResult
	func add(_ scan: Scan) -> Bool { addAll([scan]) }

	/// Drops the scans with these keys.
	@discardableResult
	func remove(_ keys: Set<String>) -> Bool {
		update { current in current.removeAll { keys.contains($0.key) } }
	}

	@discardableResult
	func markFailedPermanently(_ key: String) -> Bool {
		update { current in
			if let index = current.firstIndex(where: { $0.key == key }) { current[index].failedPermanently = true }
		}
	}

	private func update(_ change: (inout [Scan]) -> Void) -> Bool {
		let (changed, notify): (Bool, [@Sendable () -> Void]) = lock.withLock {
			var current = loaded()
			let before = current
			change(&current)
			if current == before { return (false, []) }
			write(current)
			scans = current
			return (true, Array(listeners.values))
		}
		notify.forEach { $0() }
		return changed
	}

	private func loaded() -> [Scan] {
		if let scans { return scans }
		let read = read()
		scans = read
		return read
	}

	private func read() -> [Scan] {
		guard FileManager.default.fileExists(atPath: file.path) else { return [] }
		do {
			var seen = Set<String>()
			return try JSONDecoder().decode([Scan].self, from: Data(contentsOf: file)).filter { seen.insert($0.key).inserted }
		} catch {
			// Never delete what we cannot read: it may still be recoverable by hand.
			let aside = file.deletingLastPathComponent().appending(path: "\(file.lastPathComponent).corrupt-\(Int(Date().timeIntervalSince1970 * 1000))")
			Self.log.error("Unreadable scan queue, moved to \(aside.lastPathComponent): \(error.localizedDescription)")
			try? FileManager.default.moveItem(at: file, to: aside)
			return []
		}
	}

	private func write(_ list: [Scan]) {
		do {
			// Readable after a reboot once the phone was unlocked once: a background send can run before the next unlock.
			try Scan.encoder.encode(list).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
		} catch {
			Self.log.error("Could not write the scan queue: \(error.localizedDescription)")
		}
	}
}
