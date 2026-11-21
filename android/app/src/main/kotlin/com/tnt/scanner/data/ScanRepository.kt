package com.tnt.scanner.data

/** What happened to the scans of one sending pass. */
data class SendReport(val sent: Int, val failed: Int, val retryable: Int)

/**
 * Sending and queuing, shared by the UI and the background sender. The queue is the only shared state; a scan being
 * sent is claimed first so the two senders cannot send the same one twice (the server would store it twice).
 */
class ScanRepository(val queue: ScanQueue, private val api: ScanApi) {
	private val inFlight = HashSet<String>()

	/** Always tries the network first. Returns whether it was sent; otherwise the scan is now in the queue. */
	fun submit(scan: Scan): Boolean {
		if (!claim(scan.key)) return false
		return try {
			val sent = api.send(scan) == SendResult.Sent
			if (!sent) queue.add(scan)
			sent
		} finally {
			release(scan.key)
		}
	}

	/**
	 * Sends the queued scans one by one; sent ones leave the queue, failed ones stay.
	 *
	 * @param includePermanentFailures the manual button tries everything; the background sender skips scans the
	 *   server already refused.
	 * @param onSent called after each scan that was sent
	 */
	fun sendQueued(includePermanentFailures: Boolean, onSent: () -> Unit = {}): SendReport {
		var sent = 0
		var failed = 0
		var retryable = 0
		for (scan in queue.all()) {
			if (scan.failedPermanently && !includePermanentFailures) continue
			if (!claim(scan.key)) continue
			try {
				// Our list is a snapshot: the other sender may have sent this scan and removed it since.
				if (!queue.contains(scan.key)) continue
				when (val result = api.send(scan)) {
					SendResult.Sent -> {
						queue.remove(listOf(scan.key))
						sent++
						onSent()
					}
					is SendResult.Rejected -> {
						queue.markFailedPermanently(scan.key)
						failed++
					}
					SendResult.NetworkError, is SendResult.ServerError -> {
						failed++
						retryable++
					}
				}
			} finally {
				release(scan.key)
			}
		}
		return SendReport(sent, failed, retryable)
	}

	private fun claim(key: String) = synchronized(inFlight) { inFlight.add(key) }
	private fun release(key: String) = synchronized(inFlight) { inFlight.remove(key) }
}
