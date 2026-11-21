package com.tnt.scanner.data

import android.content.SharedPreferences
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import org.json.JSONArray
import java.io.File

/**
 * A phone updated from the React Native app keeps its login and every scan it had not sent yet. The old app stored
 * them in AsyncStorage's SQLite file (`RKStorage`, table `catalystLocalStorage`), which is never modified or deleted
 * here: it stays as a fallback. Losing queued scans is the worst possible outcome of the update.
 */
class RnMigration(
	private val database: File,
	private val unparsedFile: File,
	private val prefs: SharedPreferences,
	private val login: LoginStore,
	private val queue: ScanQueue,
) {
	/** Safe to call at every launch: it does nothing once it has succeeded. It never throws. */
	fun run() {
		if (prefs.getBoolean(DONE_KEY, false)) return
		try {
			if (database.exists()) import()
			prefs.edit().putBoolean(DONE_KEY, true).commit()
		} catch (e: Exception) {
			// The flag stays unset: the next launch tries again, and the app starts normally meanwhile.
			Log.e(TAG, "Could not import the React Native data", e)
		}
	}

	private fun import() {
		val values = read()
		values[LOGIN_KEY]?.takeIf { it.isNotEmpty() }?.let { if (login.get() == null) login.set(it) }

		val raw = values[SCANS_KEY]?.let { JSONArray(it) } ?: return
		val scans = mutableListOf<Scan>()
		val unparsed = JSONArray()
		for (i in 0 until raw.length()) {
			try {
				scans += Scan.fromJson(raw.getJSONObject(i))
			} catch (e: Exception) {
				// Kept as it was, for someone to look at: dropping it silently could lose a real scan.
				Log.e(TAG, "Scan $i of the React Native queue could not be read", e)
				unparsed.put(raw.opt(i))
			}
		}
		if (unparsed.length() > 0) unparsedFile.writeText(unparsed.toString())

		queue.addAll(scans)
		val queued = queue.all().mapTo(HashSet()) { it.key }
		check(scans.all { it.key in queued }) { "The imported scans are not all in the queue" }
	}

	private fun read(): Map<String, String?> {
		val db = SQLiteDatabase.openDatabase(database.path, null, SQLiteDatabase.OPEN_READONLY)
		try {
			val values = HashMap<String, String?>()
			db.rawQuery("SELECT key, value FROM catalystLocalStorage WHERE key IN (?, ?)", arrayOf(LOGIN_KEY, SCANS_KEY)).use {
				while (it.moveToNext()) values[it.getString(0)] = it.getString(1)
			}
			return values
		} finally {
			db.close()
		}
	}

	companion object {
		const val DONE_KEY = "migratedFromRn"
		const val LOGIN_KEY = "user_number"
		const val SCANS_KEY = "offline_scans"
		private const val TAG = "RnMigration"
	}
}
