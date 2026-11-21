package com.tnt.scanner

import android.app.Application
import com.tnt.scanner.data.HttpScanApi
import com.tnt.scanner.data.LoginStore
import com.tnt.scanner.data.RnMigration
import com.tnt.scanner.data.ScanApi
import com.tnt.scanner.data.ScanQueue
import com.tnt.scanner.data.ScanRepository
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/** The few shared objects of the app: no DI framework for this. */
class TntApplication : Application() {
	val login by lazy { LoginStore(getSharedPreferences(LoginStore.PREFS, MODE_PRIVATE)) }
	val queue by lazy { ScanQueue(File(filesDir, "offline_scans.json")) }

	/** Replaced by tests, before the first use of [repository]. */
	var api: ScanApi = HttpScanApi(BuildConfig.API_URL)
	val repository by lazy { ScanRepository(queue, api) }

	override fun onCreate() {
		super.onCreate()
		// Before anything reads the login or the queue: a phone updated from the React Native app brings its data.
		RnMigration(getDatabasePath("RKStorage"), File(filesDir, "rn-unreadable-scans.json"), getSharedPreferences(LoginStore.PREFS, MODE_PRIVATE), login, queue).run()
	}

	/** Network and disk work, one job at a time. */
	val io: ExecutorService by lazy { Executors.newSingleThreadExecutor() }
}
