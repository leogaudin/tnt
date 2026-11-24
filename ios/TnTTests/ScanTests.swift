import Foundation
import Testing
@testable import TnT

struct ScanTests {
	@Test func serverBodyHasExactlyTheFieldsTheReactNativeAppSent() throws {
		let json = [String: Any].json(try Fixtures.scan().serverBody())
		#expect(Set(json.keys) == ["boxId", "operatorId", "time", "location", "markedAsReceived", "comment"])
		let location = json["location"] as! [String: Any]
		#expect(Set(location.keys) == ["coords", "timestamp", "mocked"])
		#expect(Set((location["coords"] as! [String: Any]).keys) == ["latitude", "longitude", "altitude", "accuracy", "heading", "speed"])
	}

	@Test func timeAndTimestampAreNumbersNotStrings() throws {
		let text = String(decoding: try Fixtures.scan().serverBody(), as: UTF8.self)
		#expect(text.contains("\"time\":1763700000000"))
		#expect(text.contains("\"timestamp\":1763699995000"))
		#expect(text.contains("\"accuracy\":20"))
	}

	@Test func missingCoordinatesAreNullNotLeftOut() throws {
		var scan = Fixtures.scan()
		scan.location.altitude = nil
		let coords = ([String: Any].json(try scan.serverBody())["location"] as! [String: Any])["coords"] as! [String: Any]
		#expect(coords["altitude"] is NSNull)
	}

	@Test func theQueueFlagIsNeverSentToTheServer() throws {
		var scan = Fixtures.scan()
		scan.failedPermanently = true
		#expect([String: Any].json(try scan.serverBody())["failedPermanently"] == nil)
		let queued = try JSONEncoder().encode(scan)
		#expect([String: Any].json(queued)["failedPermanently"] as? Bool == true)
		#expect([String: Any].json(try JSONEncoder().encode(Fixtures.scan()))["failedPermanently"] == nil)
	}

	@Test func scansQueuedInTheReactNativeFormatAreRead() throws {
		let scans = try JSONDecoder().decode([Scan].self, from: Fixtures.rnScans())
		#expect(scans.count == 2)
		#expect(scans[0].boxId == "11sG0fpGBwU")
		#expect(scans[0].location.altitude == 12.5)
		#expect(scans[1].location.altitude == nil)
		#expect(scans[1].location.mocked)
		#expect(scans[1].comment == "Box n°2, déchargé")
	}

	@Test func aScanSurvivesARoundTripThroughTheQueueFormat() throws {
		for scan in try JSONDecoder().decode([Scan].self, from: Fixtures.rnScans()) {
			#expect(try JSONDecoder().decode(Scan.self, from: JSONEncoder().encode(scan)) == scan)
		}
	}

	@Test func whatTheServerReadsIsUnchangedByTheRoundTrip() throws {
		let first = try JSONDecoder().decode([Scan].self, from: Fixtures.rnScans())[0]
		let sent = [String: Any].json(try first.serverBody())
		let location = sent["location"] as! [String: Any]
		let coords = location["coords"] as! [String: Any]
		#expect(coords["latitude"] as? Double == 6.3)
		#expect(coords["longitude"] as? Double == -10.8)
		#expect(coords["accuracy"] as? Double == 20.0)
		#expect(location["timestamp"] as? Int64 == 1_763_699_995_000)
		#expect(sent["operatorId"] as? String == "+231770123456")
	}

	@Test func keyIsBoxAndTime() {
		#expect(Fixtures.scan().key == "abc123|1763700000000")
	}
}
