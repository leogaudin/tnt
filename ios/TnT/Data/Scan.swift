import Foundation

/// A position in the shape the React Native app's geolocation library reported it, which is what the server stores
/// and the dashboard reads (`location.timestamp`). Names and types must not change.
struct ScanLocation: Codable, Equatable, Sendable {
	var latitude: Double
	var longitude: Double
	var altitude: Double?
	var accuracy: Double?
	var heading: Double?
	var speed: Double?
	/// Milliseconds since 1970.
	var timestamp: Int64
	var mocked: Bool

	private enum CodingKeys: String, CodingKey { case coords, timestamp, mocked }
	private enum CoordsKeys: String, CodingKey { case latitude, longitude, altitude, accuracy, heading, speed }

	init(latitude: Double, longitude: Double, altitude: Double?, accuracy: Double?, heading: Double?, speed: Double?, timestamp: Int64, mocked: Bool) {
		self.latitude = latitude
		self.longitude = longitude
		self.altitude = altitude
		self.accuracy = accuracy
		self.heading = heading
		self.speed = speed
		self.timestamp = timestamp
		self.mocked = mocked
	}

	init(from decoder: Decoder) throws {
		let container = try decoder.container(keyedBy: CodingKeys.self)
		let coords = try container.nestedContainer(keyedBy: CoordsKeys.self, forKey: .coords)
		latitude = try coords.decode(Double.self, forKey: .latitude)
		longitude = try coords.decode(Double.self, forKey: .longitude)
		altitude = try coords.decodeIfPresent(Double.self, forKey: .altitude)
		accuracy = try coords.decodeIfPresent(Double.self, forKey: .accuracy)
		heading = try coords.decodeIfPresent(Double.self, forKey: .heading)
		speed = try coords.decodeIfPresent(Double.self, forKey: .speed)
		timestamp = try container.decodeIfPresent(Int64.self, forKey: .timestamp) ?? 0
		mocked = try container.decodeIfPresent(Bool.self, forKey: .mocked) ?? false
	}

	/// Missing values are written as `null`, as the other apps do, not left out.
	func encode(to encoder: Encoder) throws {
		var container = encoder.container(keyedBy: CodingKeys.self)
		var coords = container.nestedContainer(keyedBy: CoordsKeys.self, forKey: .coords)
		try coords.encode(latitude, forKey: .latitude)
		try coords.encode(longitude, forKey: .longitude)
		try coords.encode(altitude, forKey: .altitude)
		try coords.encode(accuracy, forKey: .accuracy)
		try coords.encode(heading, forKey: .heading)
		try coords.encode(speed, forKey: .speed)
		try container.encode(timestamp, forKey: .timestamp)
		try container.encode(mocked, forKey: .mocked)
	}
}

/// A box scan. Its JSON is the body of `POST /scan` and must stay identical to what the other apps send.
struct Scan: Codable, Equatable, Sendable {
	var boxId: String
	var operatorId: String
	/// Milliseconds since 1970.
	var time: Int64
	var location: ScanLocation
	var markedAsReceived: Bool
	var comment: String
	/// Set when the server answered 4xx: the automatic sender does not retry it. Kept in the queue file only.
	var failedPermanently = false

	/// Scans of the same box at the same time are the same scan: this is how the queue is deduplicated.
	var key: String { "\(boxId)|\(time)" }

	private enum CodingKeys: String, CodingKey { case boxId, operatorId, time, location, markedAsReceived, comment, failedPermanently }

	init(boxId: String, operatorId: String, time: Int64, location: ScanLocation, markedAsReceived: Bool, comment: String, failedPermanently: Bool = false) {
		self.boxId = boxId
		self.operatorId = operatorId
		self.time = time
		self.location = location
		self.markedAsReceived = markedAsReceived
		self.comment = comment
		self.failedPermanently = failedPermanently
	}

	init(from decoder: Decoder) throws {
		let container = try decoder.container(keyedBy: CodingKeys.self)
		boxId = try container.decode(String.self, forKey: .boxId)
		operatorId = try container.decode(String.self, forKey: .operatorId)
		time = try container.decode(Int64.self, forKey: .time)
		location = try container.decode(ScanLocation.self, forKey: .location)
		markedAsReceived = try container.decodeIfPresent(Bool.self, forKey: .markedAsReceived) ?? false
		comment = try container.decodeIfPresent(String.self, forKey: .comment) ?? ""
		failedPermanently = try container.decodeIfPresent(Bool.self, forKey: .failedPermanently) ?? false
	}

	/// The queue file entry: the server body, plus the flag when it is set.
	func encode(to encoder: Encoder) throws {
		var container = encoder.container(keyedBy: CodingKeys.self)
		try container.encode(boxId, forKey: .boxId)
		try container.encode(operatorId, forKey: .operatorId)
		try container.encode(time, forKey: .time)
		try container.encode(location, forKey: .location)
		try container.encode(markedAsReceived, forKey: .markedAsReceived)
		try container.encode(comment, forKey: .comment)
		if failedPermanently { try container.encode(true, forKey: .failedPermanently) }
	}

	/// The body of `POST /scan`: never carries the flag.
	func serverBody() throws -> Data {
		var sent = self
		sent.failedPermanently = false
		return try Scan.encoder.encode(sent)
	}

	static let encoder: JSONEncoder = {
		let encoder = JSONEncoder()
		// Sorted, so the same scan always gives the same bytes.
		encoder.outputFormatting = [.withoutEscapingSlashes, .sortedKeys]
		return encoder
	}()
}
