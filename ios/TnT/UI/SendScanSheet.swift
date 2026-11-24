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
		ScrollView {
			VStack(spacing: 15) {
				SheetTitle(Strings.boxTitle(boxId))
				VStack(spacing: 4) {
					Text(Strings.location).bold()
					Text(locationText).multilineTextAlignment(.center).accessibilityIdentifier("location-text")
					if failure != nil {
						Button(Strings.retry) { locate() }.accessibilityIdentifier("retry")
					}
				}
				.padding(.vertical, 5)
				TextField(Strings.addComment, text: $comment, axis: .vertical)
					.padding(12)
					.background(RoundedRectangle(cornerRadius: 4).stroke(Theme.main))
					.onChange(of: comment) { _, new in
						if new.count > Self.maxComment { comment = String(new.prefix(Self.maxComment)) }
					}
					.accessibilityIdentifier("comment")
				Button { received.toggle() } label: {
					HStack {
						Image(systemName: received ? "checkmark.square.fill" : "square").foregroundStyle(Theme.main)
						Text(Strings.markAsReceived).foregroundStyle(.primary)
						Spacer()
					}
				}
				.buttonStyle(.plain)
				.accessibilityIdentifier("received")
				HStack(spacing: 10) {
					Button(Strings.cancel) { close() }
						.buttonStyle(.bordered)
						.accessibilityIdentifier("cancel")
					Button(Strings.send) { send() }
						.buttonStyle(.borderedProminent)
						.disabled(location == nil)
						.accessibilityIdentifier("send")
				}
				.controlSize(.large)
				.tint(Theme.main)
			}
			.padding(20)
		}
		.presentationDetents([.medium, .large])
		.onAppear { locate() }
		.onDisappear { cancelSearch?() }
	}

	private var locationText: String {
		if let location { return "(\(location.latitude), \(location.longitude))" }
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
