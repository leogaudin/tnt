package com.tnt.scanner.location

import com.tnt.scanner.data.ScanLocation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocatorTest {
	private val fix = ScanLocation(6.3, -10.8, 0.0, 20.0, 0.0, 0.0, 1000, false)

	/** Time only moves when the test says so. */
	private class FakeScheduler : Scheduler {
		private class Pending(val at: Long, val action: () -> Unit, var cancelled: Boolean = false)
		private val pending = mutableListOf<Pending>()
		var now = 0L

		override fun postDelayed(delayMs: Long, action: () -> Unit): () -> Unit {
			val p = Pending(now + delayMs, action)
			pending += p
			return { p.cancelled = true }
		}

		fun advance(ms: Long) {
			val target = now + ms
			while (true) {
				val next = pending.filter { !it.cancelled && it.at <= target }.minByOrNull { it.at } ?: break
				pending.remove(next)
				now = next.at
				next.action()
			}
			now = target
		}
	}

	/** Answers per provider: immediately with a result, or never. */
	private class FakeSource(val answers: Map<Provider, LocationResult?>) : LocationSource {
		val requested = mutableListOf<Provider>()
		var cancelled = 0
		override fun request(provider: Provider, maxAgeMs: Long, onResult: (LocationResult) -> Unit): () -> Unit {
			requested += provider
			answers[provider]?.let(onResult)
			return { cancelled++ }
		}
	}

	private val fineAndCoarse = LocationPermissions(fine = true, coarse = true)
	private val coarseOnly = LocationPermissions(fine = false, coarse = true)
	private val fail = { reason: LocationFailure -> LocationResult.Failure(reason) }

	private fun run(source: FakeSource, permissions: LocationPermissions, scheduler: FakeScheduler = FakeScheduler(), block: (FakeScheduler, () -> LocationResult?) -> Unit = { _, _ -> }): Pair<LocationResult?, FakeSource> {
		var result: LocationResult? = null
		Locator(source, scheduler) { permissions }.locate { result = it }
		block(scheduler) { result }
		return result to source
	}

	@Test
	fun `network position is used when there is one, GPS is not asked`() {
		val (result, source) = run(FakeSource(mapOf(Provider.NETWORK to LocationResult.Fix(fix))), fineAndCoarse)
		assertEquals(LocationResult.Fix(fix), result)
		assertEquals(listOf(Provider.NETWORK), source.requested)
	}

	@Test
	fun `network never answers, the 5 s timeout hands over to GPS`() {
		val source = FakeSource(mapOf(Provider.NETWORK to null, Provider.GPS to LocationResult.Fix(fix)))
		val (result, _) = run(source, fineAndCoarse) { scheduler, current ->
			scheduler.advance(4_999)
			assertNull(current())
			scheduler.advance(1)
		}
		assertEquals(LocationResult.Fix(fix), result)
		assertEquals(listOf(Provider.NETWORK, Provider.GPS), source.requested)
		assertEquals(1, source.cancelled)
	}

	@Test
	fun `network fails right away, GPS gets its position`() {
		val source = FakeSource(mapOf(Provider.NETWORK to fail(LocationFailure.UNAVAILABLE), Provider.GPS to LocationResult.Fix(fix)))
		assertEquals(LocationResult.Fix(fix), run(source, fineAndCoarse).first)
	}

	@Test
	fun `network fails and GPS never answers, it ends with a timeout 15 s after the start`() {
		val source = FakeSource(mapOf(Provider.NETWORK to null, Provider.GPS to null))
		val (result, _) = run(source, fineAndCoarse) { scheduler, current ->
			scheduler.advance(14_999)
			assertNull(current())
			scheduler.advance(1)
		}
		assertEquals(LocationResult.Failure(LocationFailure.TIMEOUT), result)
	}

	@Test
	fun `network fails and GPS is off, the message is the one for GPS`() {
		val source = FakeSource(mapOf(Provider.NETWORK to fail(LocationFailure.TIMEOUT), Provider.GPS to fail(LocationFailure.UNAVAILABLE)))
		assertEquals(fail(LocationFailure.UNAVAILABLE), run(source, fineAndCoarse).first)
	}

	@Test
	fun `permission denied by the system stops everything, GPS is not tried`() {
		val source = FakeSource(mapOf(Provider.NETWORK to fail(LocationFailure.DENIED), Provider.GPS to LocationResult.Fix(fix)))
		val (result, src) = run(source, fineAndCoarse)
		assertEquals(fail(LocationFailure.DENIED), result)
		assertEquals(listOf(Provider.NETWORK), src.requested)
	}

	@Test
	fun `no permission at all is denied without asking any provider`() {
		val (result, src) = run(FakeSource(emptyMap()), LocationPermissions(fine = false, coarse = false))
		assertEquals(fail(LocationFailure.DENIED), result)
		assertTrue(src.requested.isEmpty())
	}

	@Test
	fun `approximate only, network works`() {
		val source = FakeSource(mapOf(Provider.NETWORK to LocationResult.Fix(fix)))
		assertEquals(LocationResult.Fix(fix), run(source, coarseOnly).first)
	}

	@Test
	fun `approximate only, network fails, it says unavailable at once and never asks GPS or hangs`() {
		val source = FakeSource(mapOf(Provider.NETWORK to fail(LocationFailure.UNAVAILABLE)))
		val (result, src) = run(source, coarseOnly)
		assertEquals(fail(LocationFailure.UNAVAILABLE), result)
		assertEquals(listOf(Provider.NETWORK), src.requested)
	}

	@Test
	fun `approximate only, native side never answers, our own timeout still ends it`() {
		val source = FakeSource(mapOf(Provider.NETWORK to null))
		val (result, src) = run(source, coarseOnly) { scheduler, _ -> scheduler.advance(5_000) }
		assertEquals(fail(LocationFailure.UNAVAILABLE), result)
		assertEquals(listOf(Provider.NETWORK), src.requested)
	}

	@Test
	fun `a source that throws is reported, not propagated`() {
		val source = object : LocationSource {
			override fun request(provider: Provider, maxAgeMs: Long, onResult: (LocationResult) -> Unit): () -> Unit = throw IllegalStateException("boom")
		}
		var result: LocationResult? = null
		Locator(source, FakeScheduler()) { fineAndCoarse }.locate { result = it }
		assertEquals(fail(LocationFailure.OTHER), result)
	}

	@Test
	fun `a late answer after the timeout is ignored`() {
		val callbacks = mutableListOf<(LocationResult) -> Unit>()
		val source = object : LocationSource {
			override fun request(provider: Provider, maxAgeMs: Long, onResult: (LocationResult) -> Unit): () -> Unit {
				callbacks += onResult
				return {}
			}
		}
		val scheduler = FakeScheduler()
		val results = mutableListOf<LocationResult>()
		Locator(source, scheduler) { coarseOnly }.locate { results += it }
		scheduler.advance(5_000)
		callbacks[0](LocationResult.Fix(fix))
		assertEquals(listOf<LocationResult>(fail(LocationFailure.UNAVAILABLE)), results)
	}

	@Test
	fun `cancelling stops the search and nothing is reported`() {
		val source = FakeSource(mapOf(Provider.NETWORK to null))
		val scheduler = FakeScheduler()
		var result: LocationResult? = null
		val cancel = Locator(source, scheduler) { fineAndCoarse }.locate { result = it }
		cancel()
		scheduler.advance(60_000)
		assertNull(result)
		assertEquals(listOf(Provider.NETWORK), source.requested)
	}
}
