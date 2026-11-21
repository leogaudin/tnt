package com.tnt.scanner.phone

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import io.michaelrocks.libphonenumber.android.PhoneNumberUtil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PhoneNumbersTest {
	private val phones = PhoneNumbers(PhoneNumberUtil.createInstance(ApplicationProvider.getApplicationContext<Context>()))

	@Test
	fun `a valid mobile number of each country is stored as plus and digits`() {
		val numbers = mapOf(
			"LR" to "+231 77 123 4567",
			"MW" to "+265 991 234 567",
			"CF" to "+236 70 01 23 45",
			"GW" to "+245 955 123 456",
			"MR" to "+222 22 12 34 56",
			"NG" to "+234 803 123 4567",
			"RW" to "+250 788 123 456",
			"SN" to "+221 77 123 45 67",
			"SL" to "+232 76 123456",
			"FR" to "+33 7 42 42 42 42",
		)
		for ((country, formatted) in numbers) {
			assertEquals(country, "+" + formatted.filter { it.isDigit() }, phones.normalize(formatted))
		}
	}

	@Test
	fun `the default login of the login screen is valid`() {
		assertEquals("+33742424242", phones.normalize("+33742424242"))
	}

	@Test
	fun `formatting characters are dropped`() {
		assertEquals("+33742424242", phones.normalize("+33 (7) 42-42.42 42"))
	}

	@Test
	fun `invalid numbers are refused`() {
		assertNull(phones.normalize(""))
		assertNull(phones.normalize("+"))
		assertNull(phones.normalize("+33"))
		assertNull(phones.normalize("+231 123"))
		assertNull(phones.normalize("+33 7 42 42"))
		assertNull(phones.normalize("+999 123456789"))
	}
}
