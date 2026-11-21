package com.tnt.scanner.data

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

class ScanApiTest {
	// The JDK's own HttpServer is not on the Android compile classpath: a minimal one over a socket.
	private lateinit var server: ServerSocket
	private var status = 200
	private var body: String? = null
	private var contentType: String? = null
	private var path: String? = null

	@Before
	fun setUp() {
		server = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
		thread(isDaemon = true) {
			while (!server.isClosed) {
				try {
					server.accept().use { socket -> handle(socket) }
				} catch (e: Exception) {
					// closed by tearDown
				}
			}
		}
	}

	private fun handle(socket: Socket) {
		val input = socket.getInputStream().buffered()
		fun line(): String {
			val out = StringBuilder()
			while (true) {
				val c = input.read()
				if (c < 0 || c == '\n'.code) break
				if (c != '\r'.code) out.append(c.toChar())
			}
			return out.toString()
		}
		path = line().split(" ")[1]
		var length = 0
		while (true) {
			val header = line()
			if (header.isEmpty()) break
			val (name, value) = header.split(":", limit = 2).map { it.trim() }
			if (name.equals("Content-Length", true)) length = value.toInt()
			if (name.equals("Content-Type", true)) contentType = value
		}
		body = String(input.readNBytes(length), Charsets.UTF_8)
		socket.getOutputStream().apply {
			write("HTTP/1.1 $status X\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray())
			flush()
		}
	}

	@After
	fun tearDown() = server.close()

	private val api get() = HttpScanApi("http://127.0.0.1:${server.localPort}/api")

	@Test
	fun `2xx is sent, and the body is the server JSON`() {
		val scan = Fixtures.scan(comment = "déchargé")
		assertEquals(SendResult.Sent, api.send(scan))
		assertEquals("/api/scan", path)
		assertTrue(contentType!!.startsWith("application/json"))
		assertEquals(scan.toServerJson().toString(), JSONObject(body!!).toString())
		assertEquals("déchargé", JSONObject(body!!).getString("comment"))
	}

	@Test
	fun `404 is a permanent refusal`() {
		status = 404
		assertEquals(SendResult.Rejected(404), api.send(Fixtures.scan()))
	}

	@Test
	fun `5xx is temporary`() {
		status = 503
		assertEquals(SendResult.ServerError(503), api.send(Fixtures.scan()))
	}

	@Test
	fun `no server is a network error`() {
		val dead = HttpScanApi("http://127.0.0.1:1/api")
		assertEquals(SendResult.NetworkError, dead.send(Fixtures.scan()))
	}

	@Test
	fun `an unresolvable host is a network error`() {
		assertEquals(SendResult.NetworkError, HttpScanApi("http://tnt-does-not-exist.invalid/api").send(Fixtures.scan()))
	}

	@Test
	fun `classification of every status class`() {
		assertEquals(SendResult.Sent, HttpScanApi.classify(201))
		assertEquals(SendResult.Rejected(400), HttpScanApi.classify(400))
		assertEquals(SendResult.ServerError(500), HttpScanApi.classify(500))
		assertEquals(SendResult.ServerError(302), HttpScanApi.classify(302))
	}
}
