package com.tnt.scanner.scanner

/**
 * Decides which camera reads count. After any read the next 3 s are ignored (the same code is read many times a
 * second), and nothing counts while the send dialog is open. Only `tnt://` codes are boxes.
 */
class CodeGate(private val now: () -> Long, private val quietMs: Long = QUIET_MS) {
	private var ignoreUntil = Long.MIN_VALUE

	/** @return the box id if this read is a box to send a scan for, else null */
	fun accept(content: String, dialogOpen: Boolean): String? {
		if (dialogOpen || now() < ignoreUntil) return null
		ignoreUntil = now() + quietMs
		return content.takeIf { it.startsWith(PREFIX) }?.removePrefix(PREFIX)?.takeIf { it.isNotEmpty() }
	}

	companion object {
		const val PREFIX = "tnt://"
		const val QUIET_MS = 3_000L
	}
}
