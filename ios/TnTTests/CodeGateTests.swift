import Testing
@testable import TnT

struct CodeGateTests {
	@Test func aTntCodeGivesTheBoxId() {
		var gate = CodeGate(now: { 0 })
		#expect(gate.accept("tnt://11sG0fpGBwU", dialogOpen: false) == "11sG0fpGBwU")
	}

	@Test func otherCodesGiveNothing() {
		var now: Int64 = 0
		var gate = CodeGate(now: { now })
		#expect(gate.accept("https://example.com", dialogOpen: false) == nil)
		now += 3_000
		#expect(gate.accept("TNT://abc", dialogOpen: false) == nil)
		now += 3_000
		#expect(gate.accept("tnt:/abc", dialogOpen: false) == nil)
	}

	@Test func anEmptyBoxIdIsNotABox() {
		var gate = CodeGate(now: { 0 })
		#expect(gate.accept("tnt://", dialogOpen: false) == nil)
	}

	@Test func readsAreIgnoredFor3SecondsAfterAnyReadEvenANonTntOne() {
		var now: Int64 = 0
		var gate = CodeGate(now: { now })
		#expect(gate.accept("https://example.com", dialogOpen: false) == nil)
		now += 2_999
		#expect(gate.accept("tnt://abc", dialogOpen: false) == nil)
		now += 1
		#expect(gate.accept("tnt://abc", dialogOpen: false) == "abc")
	}

	@Test func anIgnoredReadDoesNotExtendTheQuietTime() {
		var now: Int64 = 0
		var gate = CodeGate(now: { now })
		_ = gate.accept("tnt://a", dialogOpen: false)
		now += 2_000
		_ = gate.accept("tnt://a", dialogOpen: false)
		now += 1_000
		#expect(gate.accept("tnt://a", dialogOpen: false) == "a")
	}

	@Test func nothingCountsWhileASheetIsOpenAndThatDoesNotStartTheQuietTime() {
		var gate = CodeGate(now: { 0 })
		#expect(gate.accept("tnt://a", dialogOpen: true) == nil)
		#expect(gate.accept("tnt://a", dialogOpen: false) == "a")
	}
}
