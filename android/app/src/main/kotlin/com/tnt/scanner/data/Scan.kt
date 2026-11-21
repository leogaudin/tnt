package com.tnt.scanner.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * A position as the React Native app's geolocation library reported it, which is the shape the server stores and
 * the dashboard reads (`location.timestamp`). Names and types must not change.
 */
data class ScanLocation(
	val latitude: Double,
	val longitude: Double,
	val altitude: Double?,
	val accuracy: Double?,
	val heading: Double?,
	val speed: Double?,
	val timestamp: Long,
	val mocked: Boolean,
	/** Raw JSON of the provider's extras, only present in scans queued by the React Native app. */
	val extras: String? = null,
) {
	fun toJson(): JSONObject = JSONObject()
		.put("coords", JSONObject()
			.put("latitude", latitude)
			.put("longitude", longitude)
			.put("altitude", altitude ?: JSONObject.NULL)
			.put("accuracy", accuracy ?: JSONObject.NULL)
			.put("heading", heading ?: JSONObject.NULL)
			.put("speed", speed ?: JSONObject.NULL))
		.put("timestamp", timestamp)
		.put("mocked", mocked)
		.also { if (extras != null) it.put("extras", JSONObject(extras)) }

	companion object {
		fun fromJson(json: JSONObject): ScanLocation {
			val coords = json.getJSONObject("coords")
			return ScanLocation(
				latitude = coords.getDouble("latitude"),
				longitude = coords.getDouble("longitude"),
				altitude = coords.optDoubleOrNull("altitude"),
				accuracy = coords.optDoubleOrNull("accuracy"),
				heading = coords.optDoubleOrNull("heading"),
				speed = coords.optDoubleOrNull("speed"),
				timestamp = json.optLong("timestamp", 0L),
				mocked = json.optBoolean("mocked", false),
				extras = json.optJSONObject("extras")?.toString(),
			)
		}
	}
}

/**
 * A box scan. [toServerJson] is the body of `POST /scan` and must stay identical to what the React Native app sent.
 */
data class Scan(
	val boxId: String,
	val operatorId: String,
	val time: Long,
	val location: ScanLocation,
	val markedAsReceived: Boolean,
	val comment: String,
	/** Set by the background sender when the server answered 4xx: it is not retried automatically. Never sent. */
	val failedPermanently: Boolean = false,
) {
	/** Scans of the same box at the same time are the same scan: this is how the queue is deduplicated. */
	val key: String get() = "$boxId|$time"

	fun toServerJson(): JSONObject = JSONObject()
		.put("boxId", boxId)
		.put("operatorId", operatorId)
		.put("time", time)
		.put("location", location.toJson())
		.put("markedAsReceived", markedAsReceived)
		.put("comment", comment)

	/** The queue file entry: the server body, plus the flag when it is set. */
	fun toQueueJson(): JSONObject = toServerJson().also { if (failedPermanently) it.put("failedPermanently", true) }

	companion object {
		fun fromJson(json: JSONObject): Scan = Scan(
			boxId = json.getString("boxId"),
			operatorId = json.getString("operatorId"),
			time = json.getLong("time"),
			location = ScanLocation.fromJson(json.getJSONObject("location")),
			markedAsReceived = json.optBoolean("markedAsReceived", false),
			comment = json.optString("comment", ""),
			failedPermanently = json.optBoolean("failedPermanently", false),
		)

		fun listFromJson(array: JSONArray): List<Scan> = (0 until array.length()).map { fromJson(array.getJSONObject(it)) }
	}
}

private fun JSONObject.optDoubleOrNull(name: String): Double? = if (isNull(name) || !has(name)) null else getDouble(name)
