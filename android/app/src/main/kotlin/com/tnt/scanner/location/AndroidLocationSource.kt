package com.tnt.scanner.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.os.CancellationSignal
import com.tnt.scanner.data.ScanLocation

/** The platform's `LocationManager`, with no dependency on Google Play Services (absent on some field phones). */
class AndroidLocationSource(context: Context) : LocationSource {
	private val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
	private val mainExecutor = ContextCompat.getMainExecutor(context)

	@SuppressLint("MissingPermission") // a missing permission is a SecurityException, reported as DENIED
	override fun request(provider: Provider, maxAgeMs: Long, onResult: (LocationResult) -> Unit): () -> Unit {
		val name = if (provider == Provider.GPS) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
		try {
			if (!LocationManagerCompat.isLocationEnabled(manager) || !manager.isProviderEnabled(name)) {
				onResult(LocationResult.Failure(LocationFailure.UNAVAILABLE))
				return {}
			}
			manager.getLastKnownLocation(name)?.takeIf { ageMs(it) <= maxAgeMs }?.let {
				onResult(LocationResult.Fix(toScanLocation(it)))
				return {}
			}
			val signal = CancellationSignal()
			LocationManagerCompat.getCurrentLocation(manager, name, signal, mainExecutor) { location ->
				onResult(
					if (location != null) LocationResult.Fix(toScanLocation(location))
					else LocationResult.Failure(LocationFailure.UNAVAILABLE),
				)
			}
			return { signal.cancel() }
		} catch (e: SecurityException) {
			onResult(LocationResult.Failure(LocationFailure.DENIED))
		}
		return {}
	}

	private fun ageMs(location: Location) = (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000

	private fun toScanLocation(l: Location) = ScanLocation(
		latitude = l.latitude,
		longitude = l.longitude,
		altitude = if (l.hasAltitude()) l.altitude else 0.0,
		accuracy = if (l.hasAccuracy()) l.accuracy.toDouble() else 0.0,
		heading = if (l.hasBearing()) l.bearing.toDouble() else 0.0,
		speed = if (l.hasSpeed()) l.speed.toDouble() else 0.0,
		timestamp = l.time,
		mocked = if (Build.VERSION.SDK_INT >= 31) l.isMock else @Suppress("DEPRECATION") l.isFromMockProvider,
	)
}
