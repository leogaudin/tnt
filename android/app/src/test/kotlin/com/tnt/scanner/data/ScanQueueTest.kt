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

@RunWith(RobolectricTestRunner::class)
class ScanQueueTest {
	private lateinit var dir: File
	private lateinit var file: File

	@Before
	fun setUp() {
		dir = ApplicationProvider.getApplicationContext<Context>().filesDir
		file = File(dir, "queue-test.json").also { it.delete() }
	}

	@Test
	fun `empty when there is no file`() {
		assertEquals(emptyList<Scan>(), ScanQueue(file).all())
	}

	@Test
	fun `scans are kept across instances`() {
		ScanQueue(file).apply { add(Fixtures.scan("a", 1)); add(Fixtures.scan("b", 2)) }
		assertEquals(listOf("a", "b"), ScanQueue(file).all().map { it.boxId })
	}

	@Test
	fun `the same box at the same time is queued once`() {
		val queue = ScanQueue(file)
		assertTrue(queue.add(Fixtures.scan("a", 1)))
		assertFalse(queue.add(Fixtures.scan("a", 1)))
		assertTrue(queue.add(Fixtures.scan("a", 2)))
		assertEquals(2, queue.all().size)
	}

	@Test
	fun `duplicates already in the file are dropped on load`() {
		file.writeText("[${Fixtures.scan("a", 1).toQueueJson()},${Fixtures.scan("a", 1).toQueueJson()}]")
		assertEquals(1, ScanQueue(file).all().size)
	}

	@Test
	fun `removing keeps the others, and persists`() {
		val queue = ScanQueue(file)
		queue.addAll(listOf(Fixtures.scan("a", 1), Fixtures.scan("b", 2), Fixtures.scan("c", 3)))
		queue.remove(listOf("a|1", "c|3"))
		assertEquals(listOf("b"), ScanQueue(file).all().map { it.boxId })
	}

	@Test
	fun `a corrupt file is moved aside, not deleted, and the queue starts empty`() {
		file.writeText("[{\"boxId\": \"a\", ")
		assertEquals(emptyList<Scan>(), ScanQueue(file).all())
		val aside = dir.listFiles { f -> f.name.startsWith("queue-test.json.corrupt-") }!!
		assertEquals(1, aside.size)
		assertEquals("[{\"boxId\": \"a\", ", aside[0].readText())
		aside[0].delete()
	}

	@Test
	fun `a queue that cannot be read is still usable`() {
		file.writeText("not json")
		val queue = ScanQueue(file)
		queue.add(Fixtures.scan("a", 1))
		assertEquals(listOf("a"), ScanQueue(file).all().map { it.boxId })
		dir.listFiles { f -> f.name.startsWith("queue-test.json.corrupt-") }!!.forEach { it.delete() }
	}

	@Test
	fun `marking a scan as permanently failed persists`() {
		val queue = ScanQueue(file)
		queue.add(Fixtures.scan("a", 1))
		assertTrue(queue.markFailedPermanently("a|1"))
		assertFalse(queue.markFailedPermanently("a|1"))
		assertTrue(ScanQueue(file).all().single().failedPermanently)
	}

	@Test
	fun `listeners hear about changes, not about no-ops`() {
		val queue = ScanQueue(file)
		var calls = 0
		queue.addListener { calls++ }
		queue.add(Fixtures.scan("a", 1))
		queue.add(Fixtures.scan("a", 1))
		queue.remove(listOf("zzz"))
		queue.remove(listOf("a|1"))
		assertEquals(2, calls)
	}

	@Test
	fun `concurrent writers lose nothing`() {
		val queue = ScanQueue(file)
		val threads = (0 until 8).map { t ->
			Thread { repeat(25) { i -> queue.add(Fixtures.scan("t$t", i.toLong())) } }
		}
		threads.forEach { it.start() }
		threads.forEach { it.join() }
		assertEquals(200, queue.all().size)
		assertEquals(200, ScanQueue(file).all().size)
	}
}
