import SwiftUI

/// The queued scans, kept up to date while it is open, with the manual "Send offline scans" button.
struct OfflineScansSheet: View {
	let model: AppModel

	var body: some View {
		VStack(spacing: 15) {
			SheetTitle(Strings.offlineScans)
			if model.offlineScans.isEmpty {
				Text(Strings.noOfflineScans).accessibilityIdentifier("no-offline-scans")
				Spacer()
			} else {
				ScrollView {
					VStack(spacing: 10) {
						ForEach(model.offlineScans, id: \.key) { scan in
							VStack(alignment: .leading, spacing: 7) {
								Text(Strings.boxTitle(scan.boxId)).font(.system(size: 17, weight: .bold))
								Text(Date(timeIntervalSince1970: Double(scan.time) / 1000).formatted(date: .abbreviated, time: .shortened))
							}
							.frame(maxWidth: .infinity, alignment: .leading)
							.padding(10)
							.background(RoundedRectangle(cornerRadius: 10).fill(Color(white: 0.94)))
							.accessibilityElement(children: .combine)
							.accessibilityIdentifier("offline-scan-\(scan.boxId)")
						}
					}
				}
				Button { model.sendOfflineScans(); model.showOffline = false } label: {
					Text(Strings.sendOfflineScans).frame(maxWidth: .infinity)
				}
				.buttonStyle(.borderedProminent)
				.accessibilityIdentifier("send-offline")
			}
			Button { model.showOffline = false } label: {
				Text(Strings.close).frame(maxWidth: .infinity)
			}
			.buttonStyle(.bordered)
			.accessibilityIdentifier("close-offline")
		}
		.controlSize(.large)
		.tint(Theme.main)
		.padding(20)
		.presentationDetents([.medium, .large])
	}
}
