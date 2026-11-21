package com.tnt.scanner.ui

import android.app.Activity
import android.app.Dialog
import android.view.LayoutInflater
import com.tnt.scanner.databinding.DialogLoginBinding
import com.tnt.scanner.phone.PhoneNumbers
import io.michaelrocks.libphonenumber.android.PhoneNumberUtil

/** Shown while nobody is logged in; it cannot be dismissed. The pre-filled number is Leo's choice. */
class LoginDialog(
	activity: Activity,
	util: PhoneNumberUtil,
	private val onLogin: (String) -> Unit,
) {
	private val phones = PhoneNumbers(util)
	private val binding = DialogLoginBinding.inflate(LayoutInflater.from(activity))
	private val field = PhoneField(activity, util, binding.phone, binding.countryButton, INITIAL_NUMBER) { update() }
	val dialog: Dialog = cardDialog(activity, binding.root)

	init {
		binding.loginButton.setOnClickListener {
			phones.normalize(field.text)?.let {
				dialog.dismiss()
				onLogin(it)
			}
		}
		update()
	}

	private fun update() {
		binding.loginButton.isEnabled = phones.normalize(field.text) != null
	}

	companion object {
		const val INITIAL_NUMBER = "+33742424242"
	}
}
