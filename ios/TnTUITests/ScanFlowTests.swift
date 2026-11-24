import XCTest

/// The flows of the app, end to end on the simulator. The camera, the server and the location are replaced (see
/// UITestSupport.swift): the simulator has no camera, and the tests must not touch production.
@MainActor
final class ScanFlowTests: XCTestCase {
	private let app = XCUIApplication()

	override func setUp() async throws {
		continueAfterFailure = false
	}

	private func launch(_ extra: String...) {
		app.launchArguments = ["-uiTesting"] + extra
		app.launch()
	}

	/// The location line has an identifier, so it is found by that and read by its label.
	private func waitForLocation(_ text: String, timeout: TimeInterval = 5) {
		let line = app.staticTexts["location-text"]
		XCTAssertTrue(line.waitForExistence(timeout: timeout))
		let matches = NSPredicate(format: "label == %@", text)
		XCTAssertEqual(XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: matches, object: line)], timeout: timeout), .completed, line.label)
	}

	/// Backspace one key at a time, all the way: each one must remove something, the dial code included.
	private func clear(_ field: XCUIElement) {
		// Caret at the end: a backspace in the middle that lands on a space only removes what the formatter puts back.
		field.coordinate(withNormalizedOffset: CGVector(dx: 0.99, dy: 0.5)).tap()
		for _ in 0..<40 {
			let before = (field.value as? String) ?? ""
			if before.isEmpty { return }
			field.typeText(XCUIKeyboardKey.delete.rawValue)
			let after = (field.value as? String) ?? ""
			XCTAssertLessThan(after.count, before.count, "Backspace stuck on \(before)")
		}
		XCTFail("Could not empty the field")
	}

	private func scanBox() {
		app.buttons["simulate-scan"].tap()
		XCTAssertTrue(app.navigationBars["Box n°test-box"].waitForExistence(timeout: 5))
	}

	func testLoginIsAskedFirstAndKeepsTheButtonOffForAnInvalidNumber() {
		launch()
		let button = app.buttons["login-button"]
		XCTAssertTrue(button.waitForExistence(timeout: 5))
		XCTAssertTrue(app.navigationBars["Enter your phone number"].exists)
		// Pre-filled with a valid number.
		XCTAssertTrue(button.isEnabled)

		let field = app.textFields["phone-field"]
		field.tap()
		clear(field)
		field.typeText("231123")
		XCTAssertFalse(button.isEnabled)

		clear(field)
		field.typeText("231770123456")
		XCTAssertTrue(button.isEnabled)
		button.tap()
		XCTAssertTrue(app.buttons["simulate-scan"].waitForExistence(timeout: 5))
		XCTAssertFalse(button.exists)
	}

	func testScanAndSendShowsTheSuccessToast() {
		launch("-uiLoggedIn")
		scanBox()
		let send = app.buttons["send"]
		// The position comes first: Send is disabled until there is one.
		waitForLocation("(6.3, -10.8)")
		XCTAssertTrue(send.isEnabled)
		app.textFields["comment"].tap()
		app.textFields["comment"].typeText("two pallets")
		send.tap()
		let toast = app.descendants(matching: .any)["toast"]
		XCTAssertTrue(toast.waitForExistence(timeout: 5))
		XCTAssertTrue(toast.label.contains("Success!"))
		XCTAssertTrue(app.navigationBars["Box n°test-box"].waitForNonExistence(timeout: 5))
	}

	func testWithoutNetworkTheScanIsSavedOfflineAndListed() {
		launch("-uiLoggedIn", "-uiOffline")
		scanBox()
		waitForLocation("(6.3, -10.8)")
		app.buttons["send"].tap()
		let toast = app.descendants(matching: .any)["toast"]
		XCTAssertTrue(toast.waitForExistence(timeout: 5))
		XCTAssertTrue(toast.label.contains("Scan saved offline"))

		app.buttons["offline-button"].tap()
		XCTAssertTrue(app.navigationBars["Offline scans"].waitForExistence(timeout: 5))
		XCTAssertTrue(app.descendants(matching: .any)["offline-scan-test-box"].exists)
		// Sending again fails the same way: the scan stays, and the error is explained.
		app.buttons["send-offline"].tap()
		XCTAssertTrue(app.descendants(matching: .any)["toast"].waitForExistence(timeout: 5))
		XCTAssertTrue(app.descendants(matching: .any)["toast"].label.contains("Error sending offline data"))
		app.buttons["offline-button"].tap()
		XCTAssertTrue(app.descendants(matching: .any)["offline-scan-test-box"].waitForExistence(timeout: 5))
		app.buttons["close-offline"].tap()
	}

	func testTheOfflineListIsEmptyAtFirst() {
		launch("-uiLoggedIn")
		app.buttons["offline-button"].tap()
		XCTAssertTrue(app.staticTexts["No offline scans"].waitForExistence(timeout: 5))
	}

	func testAPositionThatNeverComesEndsWithAMessageAndARetryNeverWaitingForever() {
		launch("-uiLoggedIn", "-uiNoLocation")
		scanBox()
		XCTAssertEqual(app.staticTexts["location-text"].label, "Determining...")
		XCTAssertFalse(app.buttons["send"].isEnabled)
		// 5 s for the network position, then 10 s for GPS.
		waitForLocation("The location search timed out. Move to an open area and retry.", timeout: 20)
		XCTAssertTrue(app.buttons["retry"].exists)
		XCTAssertFalse(app.buttons["send"].isEnabled)
		app.buttons["cancel"].tap()
		XCTAssertTrue(app.navigationBars["Box n°test-box"].waitForNonExistence(timeout: 5))
	}

	func testThePoweredByNoticeIsAlwaysThere() {
		launch("-uiLoggedIn")
		XCTAssertTrue(app.links["Powered by TnT (Track-and-Trace)"].waitForExistence(timeout: 5))
	}
}
