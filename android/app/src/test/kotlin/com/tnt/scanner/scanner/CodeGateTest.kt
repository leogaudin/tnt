package com.tnt.scanner.scanner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CodeGateTest {
	private var now = 0L
	private val gate = CodeGate({ now })

	@Test
	fun `a tnt code gives the box id`() {
		assertEquals("11sG0fpGBwU", gate.accept("tnt://11sG0fpGBwU", dialogOpen = false))
	}

	@Test
	fun `other codes give nothing`() {
		assertNull(gate.accept("https://example.com", dialogOpen = false))
		now += 3_000
		assertNull(gate.accept("TNT://abc", dialogOpen = false))
		now += 3_000
		assertNull(gate.accept("tnt:/abc", dialogOpen = false))
	}

	@Test
	fun `an empty box id is not a box`() {
		assertNull(gate.accept("tnt://", dialogOpen = false))
	}

	@Test
	fun `reads are ignored for 3 seconds after any read, even a non-tnt one`() {
		assertNull(gate.accept("https://example.com", dialogOpen = false))
		now += 2_999
		assertNull(gate.accept("tnt://abc", dialogOpen = false))
		now += 1
		assertEquals("abc", gate.accept("tnt://abc", dialogOpen = false))
	}

	@Test
	fun `an ignored read does not extend the quiet time`() {
		gate.accept("tnt://a", dialogOpen = false)
		now += 2_000
		gate.accept("tnt://a", dialogOpen = false)
		now += 1_000
		assertEquals("a", gate.accept("tnt://a", dialogOpen = false))
	}

	@Test
	fun `nothing counts while the dialog is open, and that does not start the quiet time`() {
		assertNull(gate.accept("tnt://a", dialogOpen = true))
		assertEquals("a", gate.accept("tnt://a", dialogOpen = false))
	}
}
