package com.tnt.scanner.data

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

sealed class SendResult {
	object Sent : SendResult()

	/** No answer: no network, DNS, timeout, TLS. Temporary. */
	object NetworkError : SendResult()

	/** The server refused the scan (e.g. 404, box not found). Retrying will not help. */
	data class Rejected(val status: Int) : SendResult()

	/** The server had a problem (5xx, Atlas cold starts). Temporary. */
	data class ServerError(val status: Int) : SendResult()
}

interface ScanApi {
	/** Blocking: call it off the main thread. */
	fun send(scan: Scan): SendResult
}

/** `POST {apiUrl}/scan`. Connectivity is never checked beforehand: the phone's own status can be wrong or late. */
class HttpScanApi(private val apiUrl: String) : ScanApi {
	override fun send(scan: Scan): SendResult {
		val connection = try {
			URL("$apiUrl/scan").openConnection() as HttpURLConnection
		} catch (e: IOException) {
			return SendResult.NetworkError
		}
		return try {
			connection.requestMethod = "POST"
			connection.connectTimeout = CONNECT_TIMEOUT_MS
			connection.readTimeout = READ_TIMEOUT_MS
			connection.doOutput = true
			connection.setRequestProperty("Content-Type", "application/json")
			connection.outputStream.use { it.write(scan.toServerJson().toString().toByteArray(Charsets.UTF_8)) }
			classify(connection.responseCode)
		} catch (e: IOException) {
			SendResult.NetworkError
		} finally {
			connection.disconnect()
		}
	}

	companion object {
		const val CONNECT_TIMEOUT_MS = 15_000
		const val READ_TIMEOUT_MS = 30_000

		fun classify(status: Int): SendResult = when (status) {
			in 200..299 -> SendResult.Sent
			in 400..499 -> SendResult.Rejected(status)
			else -> SendResult.ServerError(status)
		}
	}
}
