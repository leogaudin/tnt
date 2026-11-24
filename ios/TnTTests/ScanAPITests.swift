import Foundation
import Testing
@testable import TnT

/// Answers the requests of a test session itself, and keeps what it was asked.
final class StubProtocol: URLProtocol, @unchecked Sendable {
	nonisolated(unsafe) static var handler: ((URLRequest, Data?) throws -> Int)?
	nonisolated(unsafe) static var requests: [(URLRequest, Data?)] = []

	override class func canInit(with request: URLRequest) -> Bool { true }
	override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
	override func stopLoading() {}

	override func startLoading() {
		let body = request.httpBodyStream.map { stream -> Data in
			stream.open()
			defer { stream.close() }
			var data = Data()
			var buffer = [UInt8](repeating: 0, count: 4096)
			while stream.hasBytesAvailable {
				let count = stream.read(&buffer, maxLength: buffer.count)
				if count <= 0 { break }
				data.append(buffer, count: count)
			}
			return data
		}
		Self.requests.append((request, body))
		do {
			let status = try Self.handler!(request, body)
			client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
			client?.urlProtocolDidFinishLoading(self)
		} catch {
			client?.urlProtocol(self, didFailWithError: error)
		}
	}
}

// One stub for all of them: the tests must not run at the same time.
@Suite(.serialized)
struct ScanAPITests {
	private func api(status: Int = 200) -> HTTPScanAPI {
		StubProtocol.requests = []
		StubProtocol.handler = { _, _ in status }
		let configuration = URLSessionConfiguration.ephemeral
		configuration.protocolClasses = [StubProtocol.self]
		return HTTPScanAPI(apiUrl: "https://api.example/api", session: HTTPScanAPI.makeSession(configuration: configuration))
	}

	@Test func postsTheServerBodyToScanAsJSON() async throws {
		let scan = Fixtures.scan()
		_ = await api().send(scan)
		let (request, body) = try #require(StubProtocol.requests.first)
		#expect(request.httpMethod == "POST")
		#expect(request.url?.absoluteString == "https://api.example/api/scan")
		#expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
		#expect(body == (try scan.serverBody()))
	}

	@Test func theFlagOfTheQueueIsNotPartOfTheBody() async throws {
		var scan = Fixtures.scan()
		scan.failedPermanently = true
		_ = await api().send(scan)
		let body = try #require(StubProtocol.requests.first?.1)
		#expect([String: Any].json(body)["failedPermanently"] == nil)
	}

	@Test(arguments: [(200, SendResult.sent), (204, .sent), (404, .rejected(404)), (400, .rejected(400)), (500, .serverError(500)), (503, .serverError(503))])
	func classifiesTheAnswer(status: Int, expected: SendResult) async {
		#expect(await api(status: status).send(Fixtures.scan()) == expected)
	}

	@Test func noAnswerIsANetworkError() async {
		let api = api()
		StubProtocol.handler = { _, _ in throw URLError(.notConnectedToInternet) }
		#expect(await api.send(Fixtures.scan()) == .networkError)
	}

	@Test func anUnusableUrlIsANetworkErrorNotACrash() async {
		let api = HTTPScanAPI(apiUrl: "", session: HTTPScanAPI.makeSession())
		#expect(await api.send(Fixtures.scan()) == .networkError)
	}

	@Test func theSessionFailsFastInsteadOfWaitingForAConnection() {
		let session = HTTPScanAPI.makeSession()
		#expect(!session.configuration.waitsForConnectivity)
		#expect(session.configuration.timeoutIntervalForRequest == 30)
	}
}
