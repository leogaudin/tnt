package com.tnt.scanner.location

import android.os.Handler
import android.os.Looper

class MainScheduler : Scheduler {
	private val handler = Handler(Looper.getMainLooper())

	override fun postDelayed(delayMs: Long, action: () -> Unit): () -> Unit {
		val runnable = Runnable(action)
		handler.postDelayed(runnable, delayMs)
		return { handler.removeCallbacks(runnable) }
	}
}
