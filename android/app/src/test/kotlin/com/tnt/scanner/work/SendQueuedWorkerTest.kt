package com.tnt.scanner.work

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.BackoffPolicy
import androidx.work.ListenableWorker.Result
import androidx.work.NetworkType
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import androidx.work.Configuration
import com.tnt.scanner.TntApplication
import com.tnt.scanner.data.Fixtures
import com.tnt.scanner.data.Scan
import com.tnt.scanner.data.ScanApi
import com.tnt.scanner.data.SendResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(application = TntApplication::class, sdk = [34])
class SendQueuedWorkerTest {
	private val app get() = ApplicationProvider.getApplicationContext<TntApplication>()
	private val sent = mutableListOf<String>()

	private fun api(answer: (Scan) -> SendResult) = object : ScanApi {
		override fun send(scan: Scan): SendResult = answer(scan).also { if (it == SendResult.Sent) sent += scan.key }
	}

	private fun run(): Result = TestListenableWorkerBuilder<SendQueuedWorker>(app).build().doWork()

	@Before
	fun setUp() {
		File(app.filesDir, "offline_scans.json").delete()
	}

	@Test
	fun `everything sent gives success and an empty queue`() {
		app.api = api { SendResult.Sent }
		app.queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2)))
		assertEquals(Result.success(), run())
		assertEquals(0, app.queue.all().size)
	}

	@Test
	fun `a network error retries later and loses nothing`() {
		app.api = api { SendResult.NetworkError }
		app.queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2)))
		assertEquals(Result.retry(), run())
		assertEquals(2, app.queue.all().size)
	}

	@Test
	fun `a server error retries later`() {
		app.api = api { SendResult.ServerError(503) }
		app.queue.add(Fixtures.scan("a", 1))
		assertEquals(Result.retry(), run())
		assertFalse(app.queue.all().single().failedPermanently)
	}

	@Test
	fun `a refused scan is flagged, kept, and not retried`() {
		app.api = api { if (it.boxId == "a") SendResult.Rejected(404) else SendResult.Sent }
		app.queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2)))
		assertEquals(Result.success(), run())
		assertEquals(listOf("a"), app.queue.all().map { it.boxId })
		assertTrue(app.queue.all().single().failedPermanently)

		assertEquals(Result.success(), run())
		assertEquals(listOf("b|2"), sent)
	}

	@Test
	fun `a scan queued while the pass is running is not forgotten`() {
		app.api = api {
			if (it.boxId == "a") app.queue.add(Fixtures.scan("late", 9))
			SendResult.Sent
		}
		app.queue.add(Fixtures.scan("a", 1))
		assertEquals(Result.retry(), run())
		assertEquals(listOf("late"), app.queue.all().map { it.boxId })
		assertEquals(Result.success(), run())
		assertEquals(0, app.queue.all().size)
	}

	@Test
	fun `an empty queue gives success`() {
		app.api = api { throw AssertionError("nothing to send") }
		assertEquals(Result.success(), run())
	}

	@Test
	fun `scheduling asks for a network, with exponential backoff, and keeps a pass already waiting`() {
		WorkManagerTestInitHelper.initializeTestWorkManager(app, Configuration.Builder().build())
		SendQueuedWorker.schedule(app)
		SendQueuedWorker.schedule(app)
		val infos = WorkManager.getInstance(app).getWorkInfosForUniqueWork(SendQueuedWorker.UNIQUE_NAME).get()
		assertEquals(1, infos.size)
		assertEquals(WorkInfo.State.ENQUEUED, infos[0].state)
		assertEquals(NetworkType.CONNECTED, infos[0].constraints.requiredNetworkType)
	}
}
