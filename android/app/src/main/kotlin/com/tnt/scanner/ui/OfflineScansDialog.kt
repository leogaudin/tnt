package com.tnt.scanner.ui

import android.app.Activity
import android.app.Dialog
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import com.tnt.scanner.R
import com.tnt.scanner.data.ScanQueue
import com.tnt.scanner.databinding.DialogOfflineBinding
import com.tnt.scanner.databinding.ItemScanBinding
import java.util.Date

/** The queued scans, kept up to date while it is open, with the manual "Send offline scans" button. */
class OfflineScansDialog(
	private val activity: Activity,
	private val queue: ScanQueue,
	private val onSendAll: () -> Unit,
	private val onClosed: () -> Unit,
) {
	private val binding = DialogOfflineBinding.inflate(LayoutInflater.from(activity))
	private val dialog: Dialog = cardDialog(activity, binding.root)
	private val listener: () -> Unit = { activity.runOnUiThread { render() } }

	init {
		binding.close.setOnClickListener { dismiss() }
		binding.sendAll.setOnClickListener {
			onSendAll()
			dismiss()
		}
	}

	fun show() {
		render()
		queue.addListener(listener)
		dialog.show()
	}

	fun dismiss() {
		queue.removeListener(listener)
		if (dialog.isShowing) dialog.dismiss()
		onClosed()
	}

	private fun render() {
		val scans = queue.all()
		binding.list.removeAllViews()
		val format = DateFormat.getMediumDateFormat(activity)
		val timeFormat = DateFormat.getTimeFormat(activity)
		for (scan in scans) {
			val item = ItemScanBinding.inflate(LayoutInflater.from(activity), binding.list, false)
			item.box.text = activity.getString(R.string.box_title, scan.boxId)
			val date = Date(scan.time)
			item.time.text = "${format.format(date)} ${timeFormat.format(date)}"
			binding.list.addView(item.root)
		}
		binding.empty.visibility = if (scans.isEmpty()) View.VISIBLE else View.GONE
		binding.sendAll.visibility = if (scans.isEmpty()) View.GONE else View.VISIBLE
		(binding.list.parent as View).visibility = if (scans.isEmpty()) View.GONE else View.VISIBLE
	}
}
