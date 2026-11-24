import Foundation

/// What happened to the scans of one sending pass.
struct SendReport: Equatable, Sendable {
	var sent = 0
	var failed = 0
	var retryable = 0
}

/// Sending and queuing, shared by the UI and the automatic senders. The queue is the only shared state; a scan being
/// sent is claimed first so two senders cannot send the same one twice (the server would store it twice).
actor ScanRepository {
	nonisolated let queue: ScanQueue
	private let api: ScanAPI
	private var inFlight = Set<String>()

	init(queue: ScanQueue, api: ScanAPI) {
		self.queue = queue
		self.api = api
	}

	/// Always tries the network first. Returns whether it was sent; otherwise the scan is now in the queue.
	func submit(_ scan: Scan) async -> Bool {
		guard inFlight.insert(scan.key).inserted else { return false }
		defer { inFlight.remove(scan.key) }
		let sent = await api.send(scan) == .sent
		if !sent { queue.add(scan) }
		return sent
	}

	/// Sends the queued scans one by one; sent ones leave the queue, failed ones stay.
	///
	/// - Parameters:
	///   - includePermanentFailures: the manual button tries everything; the automatic senders skip scans the server
	///     already refused.
	///   - onSent: called after each scan that was sent
	func sendQueued(includePermanentFailures: Bool, onSent: @Sendable () -> Void = {}) async -> SendReport {
		var report = SendReport()
		for scan in queue.all() {
			if scan.failedPermanently && !includePermanentFailures { continue }
			guard inFlight.insert(scan.key).inserted else { continue }
			defer { inFlight.remove(scan.key) }
			// Our list is a snapshot: another sender may have sent this scan and removed it since.
			guard queue.contains(scan.key) else { continue }
			switch await api.send(scan) {
			case .sent:
				queue.remove([scan.key])
				report.sent += 1
				onSent()
			case .rejected:
				queue.markFailedPermanently(scan.key)
				report.failed += 1
			case .networkError, .serverError:
				report.failed += 1
				report.retryable += 1
			}
		}
		return report
	}
}
