package com.tnt.scanner.ui

import android.content.Context
import android.view.Gravity
import android.widget.Toast

object Toasts {
	private var current: Toast? = null

	/** One toast at a time, the newest replaces the one on screen. Main thread only. */
	fun show(context: Context, title: String, text: String) {
		current?.cancel()
		current = Toast.makeText(context.applicationContext, "$title\n$text", Toast.LENGTH_LONG).apply {
			setGravity(Gravity.TOP or Gravity.CENTER_HORIZONTAL, 0, (60 * context.resources.displayMetrics.density).toInt())
			show()
		}
	}
}
