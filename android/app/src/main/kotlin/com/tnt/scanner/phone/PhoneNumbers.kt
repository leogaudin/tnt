package com.tnt.scanner.phone

import io.michaelrocks.libphonenumber.android.NumberParseException
import io.michaelrocks.libphonenumber.android.PhoneNumberUtil

/**
 * The login. The dashboard groups scans by the stored string, so its format is fixed: `+` followed by the digits
 * only (e.g. `+231770123456`), exactly what the React Native phone input produced.
 */
class PhoneNumbers(private val util: PhoneNumberUtil) {
	/** @return the value to store and send as `operatorId`, or null if [input] is not a valid international number */
	fun normalize(input: String): String? {
		val digits = input.filter { it.isDigit() }
		if (digits.isEmpty()) return null
		val value = "+$digits"
		return try {
			if (util.isValidNumber(util.parse(value, null))) value else null
		} catch (e: NumberParseException) {
			null
		}
	}

	/**
	 * The digits of [input] formatted as an international number as they are typed (`+231 77 123`). Without trailing
	 * separators: the formatter ends `+33` with a space, which a backspace would remove and the field add back, so
	 * nothing before it could ever be deleted.
	 */
	fun format(input: String): String {
		val digits = input.filter { it.isDigit() }
		if (digits.isEmpty()) return ""
		val formatter = util.getAsYouTypeFormatter("FR")
		var formatted = formatter.inputDigit('+')
		for (c in digits) formatted = formatter.inputDigit(c)
		return formatted.trimEnd { !it.isDigit() }
	}
}
