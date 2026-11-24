import Foundation

enum SendResult: Equatable, Sendable {
	case sent
	/// No answer: no network, DNS, timeout, TLS. Temporary.
	case networkError
	/// The server refused the scan (e.g. 404, box not found). Retrying will not help.
	case rejected(Int)
	/// The server had a problem (5xx, Atlas cold starts). Temporary.
	case serverError(Int)
}

protocol ScanAPI: Sendable {
	func send(_ scan: Scan) async -> SendResult
}

/// `POST {apiUrl}/scan`. Connectivity is never checked beforehand: the phone's own status can be wrong or late.
struct HTTPScanAPI: ScanAPI {
	let apiUrl: String
	var session: URLSession = HTTPScanAPI.makeSession()

	static let timeout: TimeInterval = 30

	/// Fails fast when there is no connection (the scan is then queued) instead of waiting for one.
	static func makeSession(configuration: URLSessionConfiguration = .ephemeral) -> URLSession {
		configuration.waitsForConnectivity = false
		configuration.timeoutIntervalForRequest = timeout
		return URLSession(configuration: configuration)
	}

	func send(_ scan: Scan) async -> SendResult {
		guard let url = URL(string: "\(apiUrl)/scan"), let body = try? scan.serverBody() else { return .networkError }
		var request = URLRequest(url: url)
		request.httpMethod = "POST"
		request.setValue("application/json", forHTTPHeaderField: "Content-Type")
		request.httpBody = body
		do {
			let (_, response) = try await session.data(for: request)
			guard let status = (response as? HTTPURLResponse)?.statusCode else { return .networkError }
			return Self.classify(status)
		} catch {
			return .networkError
		}
	}

	static func classify(_ status: Int) -> SendResult {
		switch status {
		case 200...299: .sent
		case 400...499: .rejected(status)
		default: .serverError(status)
		}
	}
}
