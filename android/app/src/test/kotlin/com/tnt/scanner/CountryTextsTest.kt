package com.tnt.scanner

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * The texts of the country being built (-PtntCountry) are the ones of mobile/strings for its language, with its own
 * overrides on top. The expectation is read from the same files, so it holds for every country.
 */
@RunWith(RobolectricTestRunner::class)
class CountryTextsTest {
	private val mobile = File("../../mobile")
	private val context = ApplicationProvider.getApplicationContext<Context>()

	private fun json(file: File) = JSONObject(file.readText())
	private fun JSONObject.texts() = keys().asSequence().associateWith { getString(it) }

	private val country = BuildConfig.API_URL.let { url ->
		mobile.resolve("countries").listFiles { f -> f.isDirectory && f.resolve("config.json").exists() }!!
			.first { json(it.resolve("config.json")).getString("apiUrl") == url }
	}
	private val config = json(country.resolve("config.json"))
	private val language = config.optString("language", "en")
	private val expected: Map<String, String> = json(mobile.resolve("strings/en.json")).texts() +
		(if (language == "en") emptyMap() else json(mobile.resolve("strings/$language.json")).texts()) +
		(config.optJSONObject("strings")?.texts() ?: emptyMap())

	private fun text(key: String): String {
		val name = key.replace(Regex("([A-Z])")) { "_" + it.value.lowercase() }
		return context.getString(context.resources.getIdentifier(name, "string", context.packageName))
	}

	@Test
	fun `every text is the one of the country's language, plus its overrides`() {
		assertTrue(expected.size > 20)
		for ((key, value) in expected) {
			if (key == "boxTitle") continue
			assertEquals(key, value, text(key))
		}
	}

	@Test
	fun `the box title takes the box id`() {
		assertEquals(expected.getValue("boxTitle").replace("{id}", "abc"), context.getString(R.string.box_title, "abc"))
	}

	@Test
	fun `the attribution notice is never translated or overridden`() {
		assertEquals("Powered by TnT (Track-and-Trace)", context.getString(R.string.powered_by))
	}
}
