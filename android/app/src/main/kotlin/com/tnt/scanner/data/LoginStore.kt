package com.tnt.scanner.data

import android.content.SharedPreferences

/** The operator's phone number, `+` and digits only. There is no logout. */
class LoginStore(private val prefs: SharedPreferences) {
	fun get(): String? = prefs.getString(KEY, null)?.takeIf { it.isNotEmpty() }

	fun set(number: String) {
		// commit(), not apply(): the app can be killed right after the login screen closes.
		prefs.edit().putString(KEY, number).commit()
	}

	companion object {
		const val PREFS = "tnt"
		const val KEY = "user_number"
	}
}
