package com.tnt.scanner.data

import org.json.JSONArray

object Fixtures {
	fun scan(boxId: String = "abc123", time: Long = 1763700000000, comment: String = "") = Scan(
		boxId = boxId,
		operatorId = "+231770123456",
		time = time,
		location = ScanLocation(6.3, -10.8, 12.0, 20.0, 0.0, 0.0, time - 5000, false),
		markedAsReceived = false,
		comment = comment,
	)

	/** Scans as the React Native app queued them. */
	fun rnScans(): JSONArray = JSONArray(String(javaClass.classLoader!!.getResourceAsStream("rn-offline-scans.json")!!.readBytes()))
}
