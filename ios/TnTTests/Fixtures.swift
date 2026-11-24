import Foundation
@testable import TnT

enum Fixtures {
	static func scan(_ boxId: String = "abc123", time: Int64 = 1_763_700_000_000, comment: String = "") -> Scan {
		Scan(
			boxId: boxId,
			operatorId: "+231770123456",
			time: time,
			location: ScanLocation(latitude: 6.3, longitude: -10.8, altitude: 12.0, accuracy: 20.0, heading: 0.0, speed: 0.0, timestamp: time - 5000, mocked: false),
			markedAsReceived: false,
			comment: comment
		)
	}

	/// Scans as the React Native app queued them (shared with the Android tests).
	static func rnScans() throws -> Data {
		try Data(contentsOf: Bundle(for: BundleToken.self).url(forResource: "rn-offline-scans", withExtension: "json")!)
	}

	/// A queue file in a fresh temporary directory.
	static func tempFile(_ name: String = "queue.json") -> URL {
		let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
		try! FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
		return dir.appending(path: name)
	}

	private final class BundleToken {}
}

extension Dictionary where Key == String {
	/// JSON object → dictionary, for checking exactly which fields a body has.
	static func json(_ data: Data) -> [String: Any] { try! JSONSerialization.jsonObject(with: data) as! [String: Any] }
}
