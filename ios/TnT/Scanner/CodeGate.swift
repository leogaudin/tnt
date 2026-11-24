import Foundation

/// Decides which camera reads count. After any read the next 3 s are ignored (the same code is read many times a
/// second), and nothing counts while a sheet that blocks scanning is open. Only `tnt://` codes are boxes.
struct CodeGate {
	static let prefix = "tnt://"
	static let quietMs: Int64 = 3_000

	private let now: () -> Int64
	private let quietMs: Int64
	private var ignoreUntil = Int64.min

	init(now: @escaping () -> Int64, quietMs: Int64 = CodeGate.quietMs) {
		self.now = now
		self.quietMs = quietMs
	}

	/// The box id if this read is a box to send a scan for, else nil.
	mutating func accept(_ content: String, dialogOpen: Bool) -> String? {
		if dialogOpen || now() < ignoreUntil { return nil }
		ignoreUntil = now() + quietMs
		guard content.hasPrefix(Self.prefix) else { return nil }
		let id = String(content.dropFirst(Self.prefix.count))
		return id.isEmpty ? nil : id
	}
}
