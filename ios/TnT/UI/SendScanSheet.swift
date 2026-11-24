import SwiftUI

/// The scan form: finds the position as soon as it opens, and lets Send through once there is one.
struct SendScanSheet: View {
	static let maxComment = 140

	let model: AppModel
	let boxId: String
	@State private var location: ScanLocation?
	@State private var failure: LocationFailure?
	@State private var comment = ""
	@State private var received = false
	@State private var cancelSearch: Cancel?

	var body: some View {
		NavigationStack {
			Form {
				Section(Strings.location) {
					HStack {
						if location == nil && failure == nil { ProgressView() }
						Text(locationText)
							.foregroundStyle(failure == nil ? Color.primary : Color.secondary)
							.accessibilityIdentifier("location-text")
						if failure != nil {
							Spacer()
							Button(Strings.retry) { locate() }
								.buttonStyle(.borderless)
								.accessibilityIdentifier("retry")
						}
					}
				}
				Section {
					TextField(Strings.addComment, text: $comment, axis: .vertical)
						.lineLimit(1...4)
						.onChange(of: comment) { _, new in
							if new.count > Self.maxComment { comment = String(new.prefix(Self.maxComment)) }
						}
						.accessibilityIdentifier("comment")
					Toggle(Strings.markAsReceived, isOn: $received)
						.accessibilityIdentifier("received")
				}
			}
			.navigationTitle(Strings.boxTitle(boxId))
			.navigationBarTitleDisplayMode(.inline)
			.toolbar {
				ToolbarItem(placement: .cancellationAction) {
					Button(Strings.cancel) { close() }.accessibilityIdentifier("cancel")
				}
				ToolbarItem(placement: .confirmationAction) {
					Button(Strings.send) { send() }
						.bold()
						.disabled(location == nil)
						.accessibilityIdentifier("send")
				}
			}
		}
		.tint(Theme.tint)
		.presentationDetents([.medium, .large])
		.onAppear { locate() }
		.onDisappear { cancelSearch?() }
	}

	private var locationText: String {
		if let location { return "(\(Coordinates.format(location.latitude)), \(Coordinates.format(location.longitude)))" }
		return failure?.message ?? Strings.determining
	}

	private func locate() {
		failure = nil
		cancelSearch?()
		cancelSearch = model.locator.locate { result in
			switch result {
			case .fix(let fix):
				location = fix
			case .failure(let reason):
				failure = reason
				model.show(Strings.toastLocation, reason.message)
			}
		}
	}

	private func send() {
		guard let location, let login = model.login else { return }
		model.submit(Scan(
			boxId: boxId,
			operatorId: login,
			time: Int64(Date().timeIntervalSince1970 * 1000),
			location: location,
			markedAsReceived: received,
			comment: comment
		))
		close()
	}

	private func close() {
		cancelSearch?()
		model.sendTarget = nil
	}
}

/// How a position is shown: the same everywhere whatever the phone's language, with no more digits than are meaningful.
/// Display only: what is sent keeps its full precision.
enum Coordinates {
	static func format(_ value: Double) -> String {
		value.formatted(.number.locale(Locale(identifier: "en_US_POSIX")).grouping(.never).precision(.fractionLength(0...5)))
	}
}
