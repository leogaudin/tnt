package com.tnt.scanner.ui

import android.app.Activity
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.tnt.scanner.phone.PhoneNumbers
import io.michaelrocks.libphonenumber.android.NumberParseException
import io.michaelrocks.libphonenumber.android.PhoneNumberUtil
import java.util.Locale

/**
 * An international phone input: the field holds the whole number (`+33 7 42 42 42 42`), formatted as it is typed,
 * and the flag next to it shows the country of the dial code and lets the user pick another one.
 */
class PhoneField(
	private val activity: Activity,
	private val util: PhoneNumberUtil,
	private val input: EditText,
	private val flag: TextView,
	initial: String,
	private val onChange: () -> Unit,
) {
	private val phones = PhoneNumbers(util)
	private var formatting = false

	init {
		input.addTextChangedListener(object : TextWatcher {
			override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
			override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
			override fun afterTextChanged(s: Editable) {
				if (formatting) return
				format(s.toString())
				onChange()
			}
		})
		flag.setOnClickListener { pickCountry() }
		format(initial)
	}

	val text: String get() = input.text.toString()

	private fun format(raw: String) {
		val formatted = phones.format(raw)
		formatting = true
		if (input.text.toString() != formatted) {
			input.setText(formatted)
			input.setSelection(formatted.length)
		}
		formatting = false
		flag.text = regionFlag(regionOf(raw.filter { it.isDigit() }))
	}

	private fun regionOf(digits: String): String? {
		if (digits.isEmpty()) return null
		return try {
			util.getRegionCodeForCountryCode(util.parse("+$digits", null).countryCode).takeIf { it != "ZZ" }
		} catch (e: NumberParseException) {
			null
		}
	}

	private fun dialCodeOf(digits: String): String = try {
		util.parse("+$digits", null).countryCode.toString()
	} catch (e: NumberParseException) {
		""
	}

	private fun pickCountry() {
		val regions = util.supportedRegions
			.map { it to Locale("", it).getDisplayCountry(Locale.ENGLISH) }
			.sortedBy { it.second }
		val labels = regions.map { (code, name) -> "${regionFlag(code)}  $name (+${util.getCountryCodeForRegion(code)})" }
		AlertDialog.Builder(activity)
			.setItems(labels.toTypedArray()) { _, which ->
				val digits = text.filter { it.isDigit() }
				val national = digits.removePrefix(dialCodeOf(digits))
				format("${util.getCountryCodeForRegion(regions[which].first)}$national")
				onChange()
			}
			.show()
	}

	private fun regionFlag(region: String?): String =
		if (region == null) "🌐" else region.map { String(Character.toChars(0x1F1E6 + (it - 'A'))) }.joinToString("")
}
