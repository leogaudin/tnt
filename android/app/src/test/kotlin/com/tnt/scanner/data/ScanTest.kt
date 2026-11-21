package com.tnt.scanner.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanTest {
	@Test
	fun `server body has exactly the fields the React Native app sent`() {
		val json = Fixtures.scan().toServerJson()
		assertEquals(setOf("boxId", "operatorId", "time", "location", "markedAsReceived", "comment"), json.keys().asSequence().toSet())
		val location = json.getJSONObject("location")
		assertEquals(setOf("coords", "timestamp", "mocked"), location.keys().asSequence().toSet())
		assertEquals(setOf("latitude", "longitude", "altitude", "accuracy", "heading", "speed"), location.getJSONObject("coords").keys().asSequence().toSet())
	}

	@Test
	fun `time and timestamp are numbers, not strings`() {
		val json = Fixtures.scan().toServerJson()
		assertTrue(json.get("time") is Long)
		assertTrue(json.getJSONObject("location").get("timestamp") is Long)
		assertTrue(json.getJSONObject("location").getJSONObject("coords").get("accuracy") is Double)
	}

	@Test
	fun `the permanent failure flag is never sent to the server`() {
		val scan = Fixtures.scan().copy(failedPermanently = true)
		assertFalse(scan.toServerJson().has("failedPermanently"))
		assertTrue(scan.toQueueJson().getBoolean("failedPermanently"))
		assertFalse(Fixtures.scan().toQueueJson().has("failedPermanently"))
	}

	@Test
	fun `scans queued by the React Native app are read, nulls and extras included`() {
		val scans = Scan.listFromJson(Fixtures.rnScans())
		assertEquals(2, scans.size)
		assertEquals("11sG0fpGBwU", scans[0].boxId)
		assertEquals(12.5, scans[0].location.altitude!!, 0.0)
		assertEquals(null, scans[1].location.altitude)
		assertEquals(true, scans[1].location.mocked)
		assertEquals("Box n°2, déchargé", scans[1].comment)
		assertTrue(scans[1].location.extras!!.contains("satellites"))
	}

	@Test
	fun `a scan survives a round trip through the queue format`() {
		for (scan in Scan.listFromJson(Fixtures.rnScans())) {
			val again = Scan.fromJson(JSONObject(scan.toQueueJson().toString()))
			assertEquals(scan, again)
		}
	}

	@Test
	fun `what the server reads is unchanged by the round trip`() {
		val original = Fixtures.rnScans().getJSONObject(0)
		val sent = Scan.fromJson(original).toServerJson()
		val coords = sent.getJSONObject("location").getJSONObject("coords")
		assertEquals(6.3, coords.getDouble("latitude"), 0.0)
		assertEquals(-10.8, coords.getDouble("longitude"), 0.0)
		assertEquals(20.0, coords.getDouble("accuracy"), 0.0)
		assertEquals(1763699995000, sent.getJSONObject("location").getLong("timestamp"))
		assertEquals("+231770123456", sent.getString("operatorId"))
	}

	@Test
	fun `key is box and time`() {
		assertEquals("abc123|1763700000000", Fixtures.scan().key)
	}
}
