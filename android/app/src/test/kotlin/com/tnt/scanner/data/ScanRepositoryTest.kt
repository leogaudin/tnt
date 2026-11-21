package com.tnt.scanner.data

import androidx.test.core.app.ApplicationProvider
import android.content.Context
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

@RunWith(RobolectricTestRunner::class)
class ScanRepositoryTest {
	private lateinit var queue: ScanQueue

	private class FakeApi(var answer: (Scan) -> SendResult) : ScanApi {
		val sent = mutableListOf<String>()
		override fun send(scan: Scan): SendResult = answer(scan).also { if (it == SendResult.Sent) synchronized(sent) { sent += scan.key } }
	}

	@Before
	fun setUp() {
		val file = File(ApplicationProvider.getApplicationContext<Context>().filesDir, "repo-test.json").also { it.delete() }
		queue = ScanQueue(file)
	}

	@Test
	fun `a scan that is sent is not queued`() {
		val repo = ScanRepository(queue, FakeApi { SendResult.Sent })
		assertTrue(repo.submit(Fixtures.scan()))
		assertEquals(0, queue.all().size)
	}

	@Test
	fun `a scan that cannot be sent is queued, whatever the reason`() {
		val filesDir = ApplicationProvider.getApplicationContext<Context>().filesDir
		listOf(SendResult.NetworkError, SendResult.ServerError(503), SendResult.Rejected(404)).forEachIndexed { i, result ->
			val q = ScanQueue(File(filesDir, "case-$i.json").also { it.delete() })
			assertFalse(ScanRepository(q, FakeApi { result }).submit(Fixtures.scan()))
			assertEquals(1, q.all().size)
		}
	}

	@Test
	fun `queued scans are sent one by one, the sent ones leave, the failed ones stay`() {
		queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2), Fixtures.scan("c", 3)))
		val api = FakeApi { if (it.boxId == "b") SendResult.NetworkError else SendResult.Sent }
		val report = ScanRepository(queue, api).sendQueued(includePermanentFailures = true)
		assertEquals(SendReport(sent = 2, failed = 1, retryable = 1), report)
		assertEquals(listOf("b"), queue.all().map { it.boxId })
	}

	@Test
	fun `the background pass flags a refused scan and never sends it again`() {
		queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2)))
		val api = FakeApi { if (it.boxId == "a") SendResult.Rejected(404) else SendResult.Sent }
		val repo = ScanRepository(queue, api)

		val first = repo.sendQueued(includePermanentFailures = false)
		assertEquals(SendReport(sent = 1, failed = 1, retryable = 0), first)
		assertTrue(queue.all().single().failedPermanently)

		api.answer = { SendResult.Sent }
		val second = repo.sendQueued(includePermanentFailures = false)
		assertEquals(SendReport(0, 0, 0), second)
		assertEquals(listOf("b"), api.sent.map { it.substringBefore('|') }.filter { it == "b" })
		assertEquals(1, queue.all().size)
	}

	@Test
	fun `the manual pass still tries a scan the server refused before`() {
		queue.add(Fixtures.scan("a", 1).copy(failedPermanently = true))
		val api = FakeApi { SendResult.Sent }
		val report = ScanRepository(queue, api).sendQueued(includePermanentFailures = true)
		assertEquals(1, report.sent)
		assertEquals(0, queue.all().size)
	}

	@Test
	fun `a server problem is retryable, a network error too`() {
		queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2)))
		val api = FakeApi { if (it.boxId == "a") SendResult.ServerError(500) else SendResult.NetworkError }
		assertEquals(SendReport(0, 2, 2), ScanRepository(queue, api).sendQueued(false))
		assertEquals(2, queue.all().size)
		assertFalse(queue.all().any { it.failedPermanently })
	}

	@Test
	fun `the UI queuing while the worker sends loses nothing`() {
		queue.addAll((0 until 20).map { Fixtures.scan("old", it.toLong()) })
		val api = FakeApi { Thread.sleep(1); SendResult.Sent }
		val repo = ScanRepository(queue, api)
		val start = CountDownLatch(1)
		val worker = Thread { start.await(); repo.sendQueued(false) }
		val ui = Thread { start.await(); repeat(20) { queue.add(Fixtures.scan("new", it.toLong())); Thread.sleep(1) } }
		worker.start(); ui.start(); start.countDown()
		worker.join(); ui.join()
		val left = queue.all()
		assertTrue("old scans left: $left", left.none { it.boxId == "old" })
		assertEquals(20, left.count { it.boxId == "new" } + api.sent.count { it.startsWith("new") })
	}

	@Test
	fun `the manual button and the worker never send the same scan twice`() {
		queue.addAll((0 until 30).map { Fixtures.scan("x", it.toLong()) })
		val api = FakeApi { Thread.sleep(1); SendResult.Sent }
		val repo = ScanRepository(queue, api)
		val start = CountDownLatch(1)
		val threads = listOf(false, true).map { manual -> Thread { start.await(); repo.sendQueued(manual) } }
		threads.forEach { it.start() }
		start.countDown()
		threads.forEach { it.join(5000) }
		assertEquals(30, api.sent.size)
		assertEquals(30, api.sent.toSet().size)
		assertEquals(0, queue.all().size)
	}
}
