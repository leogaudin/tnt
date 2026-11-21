package com.tnt.scanner.ui

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatDialog
import com.tnt.scanner.R

/** A white card with 90% of the screen width, not dismissed by a tap outside or the back key. */
fun cardDialog(activity: Activity, content: View): AppCompatDialog = AppCompatDialog(activity, R.style.Theme_Tnt_Dialog).apply {
	setContentView(content)
	setCancelable(false)
	window?.setLayout((activity.resources.displayMetrics.widthPixels * 0.9).toInt(), ViewGroup.LayoutParams.WRAP_CONTENT)
}
