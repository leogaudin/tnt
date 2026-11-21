package com.tnt.scanner.location

import com.tnt.scanner.data.ScanLocation

enum class Provider { NETWORK, GPS }

/** Why no position could be had. [message] says what the user can do about it. */
enum class LocationFailure(val message: String) {
	DENIED("Location access is denied. Allow it for this app in the phone settings."),
	UNAVAILABLE("Location is unavailable. Turn on location in the phone settings."),
	TIMEOUT("The location search timed out. Move to an open area and retry."),
	OTHER("Location could not be determined."),
}

sealed class LocationResult {
	data class Fix(val location: ScanLocation) : LocationResult()
	data class Failure(val reason: LocationFailure) : LocationResult()
}

/** One provider, one position request. May never call back (the bug that left RN on "Determining..." forever). */
interface LocationSource {
	/** @return a function that cancels the request */
	fun request(provider: Provider, maxAgeMs: Long, onResult: (LocationResult) -> Unit): () -> Unit
}

interface Scheduler {
	/** @return a function that cancels the pending call */
	fun postDelayed(delayMs: Long, action: () -> Unit): () -> Unit
}

/** Which location permissions the user granted. Approximate-only users must still be able to work. */
data class LocationPermissions(val fine: Boolean, val coarse: Boolean) {
	val any get() = fine || coarse
}

/**
 * Gets the phone's position: the network location first (fast, and reliable on old phones), then GPS when there is no
 * network location to be had, e.g. on a satellite (Starlink) connection with no mobile network.
 *
 * Every step has its own timeout, enforced here and not left to the provider, so the answer always comes.
 * All callbacks run on the thread of the [Scheduler] (the main thread in the app).
 */
class Locator(
	private val source: LocationSource,
	private val scheduler: Scheduler,
	private val permissions: () -> LocationPermissions,
) {
	/** @return a function that cancels the search; no callback is made after it. */
	fun locate(onResult: (LocationResult) -> Unit): () -> Unit {
		var cancelled = false
		var cancelStep: () -> Unit = {}
		fun finish(result: LocationResult) {
			if (!cancelled) {
				cancelled = true
				onResult(result)
			}
		}

		val granted = permissions()
		if (!granted.any) {
			finish(LocationResult.Failure(LocationFailure.DENIED))
			return {}
		}

		cancelStep = attempt(Provider.NETWORK, NETWORK_TIMEOUT_MS) { network ->
			if (network is LocationResult.Fix || (network as LocationResult.Failure).reason == LocationFailure.DENIED) {
				finish(network)
			} else if (!granted.fine) {
				// GPS needs the precise permission: with only the approximate one it can only fail, so say so now.
				finish(LocationResult.Failure(LocationFailure.UNAVAILABLE))
			} else {
				cancelStep = attempt(Provider.GPS, GPS_TIMEOUT_MS, ::finish)
			}
		}
		return {
			cancelled = true
			cancelStep()
		}
	}

	/** One request that settles exactly once: with the provider's answer, or with a timeout. */
	private fun attempt(provider: Provider, timeoutMs: Long, done: (LocationResult) -> Unit): () -> Unit {
		var settled = false
		var cancelTimer: () -> Unit = {}
		var cancelRequest: () -> Unit = {}
		fun settle(result: LocationResult) {
			if (settled) return
			settled = true
			cancelTimer()
			cancelRequest()
			done(result)
		}
		cancelTimer = scheduler.postDelayed(timeoutMs) { settle(LocationResult.Failure(LocationFailure.TIMEOUT)) }
		try {
			cancelRequest = source.request(provider, MAX_AGE_MS, ::settle)
		} catch (e: Exception) {
			settle(LocationResult.Failure(LocationFailure.OTHER))
		}
		return {
			settled = true
			cancelTimer()
			cancelRequest()
		}
	}

	companion object {
		const val NETWORK_TIMEOUT_MS = 5_000L
		const val GPS_TIMEOUT_MS = 10_000L
		const val MAX_AGE_MS = 10_000L
	}
}
