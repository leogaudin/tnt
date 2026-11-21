package com.tnt.scanner.work

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.tnt.scanner.TntApplication
import java.util.concurrent.TimeUnit

/**
 * Sends the queued scans in the background once the phone has a network, so they do not wait for someone to open
 * the offline list. Purely additive: the manual button and everything else work the same without it. It makes no
 * noise (no toast, no notification): the app may be closed.
 */
class SendQueuedWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
	override fun doWork(): Result {
		val app = applicationContext as TntApplication
		val report = app.repository.sendQueued(includePermanentFailures = false)
		// Scans the server refused (4xx) stay in the list but are not retried here. Anything else left is waiting
		// for a better moment, or was queued while this pass was running.
		val waiting = report.retryable > 0 || app.queue.all().any { !it.failedPermanently }
		return if (waiting) Result.retry() else Result.success()
	}

	companion object {
		const val UNIQUE_NAME = "send-queued-scans"
		const val FIRST_BACKOFF_SECONDS = 30L

		/** Asks for a sending pass as soon as there is a network. A pass already waiting is kept. */
		fun schedule(context: Context) {
			val request = OneTimeWorkRequestBuilder<SendQueuedWorker>()
				.setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
				.setBackoffCriteria(BackoffPolicy.EXPONENTIAL, FIRST_BACKOFF_SECONDS, TimeUnit.SECONDS)
				.build()
			WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE_NAME, ExistingWorkPolicy.KEEP, request)
		}
	}
}
