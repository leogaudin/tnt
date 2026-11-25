package com.tnt.scanner.ui

import android.app.Activity
import android.app.Dialog
import android.view.LayoutInflater
import android.view.View
import com.tnt.scanner.R
import com.tnt.scanner.data.Scan
import com.tnt.scanner.data.ScanLocation
import com.tnt.scanner.databinding.DialogSendBinding
import com.tnt.scanner.location.LocationResult
import com.tnt.scanner.location.Locator

/**
 * The scan form: finds the position as soon as it opens, and lets Send through once there is one.
 * [onSend] gets the finished scan; the caller sends or queues it.
 */
class SendScanDialog(
	private val activity: Activity,
	private val boxId: String,
	private val locator: Locator,
	private val login: String,
	private val onSend: (Scan) -> Unit,
	private val onClosed: () -> Unit,
) {
	private val binding = DialogSendBinding.inflate(LayoutInflater.from(activity))
	private val dialog: Dialog = cardDialog(activity, binding.root)
	private var location: ScanLocation? = null
	private var cancelSearch: () -> Unit = {}

	init {
		binding.title.text = activity.getString(R.string.box_title, boxId)
		binding.retry.setOnClickListener { locate() }
		binding.cancel.setOnClickListener { close() }
		binding.send.setOnClickListener {
			val fix = location ?: return@setOnClickListener
			onSend(Scan(
				boxId = boxId,
				operatorId = login,
				time = System.currentTimeMillis(),
				location = fix,
				markedAsReceived = binding.received.isChecked,
				comment = binding.comment.text.toString(),
			))
			close()
		}
	}

	fun show() {
		dialog.show()
		locate()
	}

	/** Closes without sending, e.g. when the activity goes away. */
	fun dismiss() = close()

	private fun locate() {
		binding.retry.visibility = View.GONE
		binding.location.setText(R.string.determining)
		cancelSearch()
		cancelSearch = locator.locate { result ->
			when (result) {
				is LocationResult.Fix -> {
					location = result.location
					binding.location.text = "(${result.location.latitude}, ${result.location.longitude})"
					binding.send.isEnabled = true
				}
				is LocationResult.Failure -> {
					binding.location.text = activity.getString(result.reason.message)
					binding.retry.visibility = View.VISIBLE
					Toasts.show(activity, activity.getString(R.string.toast_location), activity.getString(result.reason.message))
				}
			}
		}
	}

	private fun close() {
		cancelSearch()
		if (dialog.isShowing) dialog.dismiss()
		onClosed()
	}
}
