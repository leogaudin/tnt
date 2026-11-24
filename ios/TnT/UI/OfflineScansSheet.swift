import SwiftUI

/// The queued scans, kept up to date while it is open, with the manual "Send offline scans" button.
struct OfflineScansSheet: View {
	let model: AppModel

	var body: some View {
		NavigationStack {
			Group {
				if model.offlineScans.isEmpty {
					ContentUnavailableView(Strings.noOfflineScans, systemImage: "tray")
				} else {
					List(model.offlineScans, id: \.key) { scan in
						VStack(alignment: .leading, spacing: 4) {
							Text(Strings.boxTitle(scan.boxId)).font(.headline)
							Text(Date(timeIntervalSince1970: Double(scan.time) / 1000).formatted(date: .abbreviated, time: .shortened))
								.foregroundStyle(.secondary)
						}
						.accessibilityElement(children: .combine)
						.accessibilityIdentifier("offline-scan-\(scan.boxId)")
					}
					.safeAreaInset(edge: .bottom) {
						Button { model.sendOfflineScans(); model.showOffline = false } label: {
							Text(Strings.sendOfflineScans).frame(maxWidth: .infinity).foregroundStyle(Theme.onTint)
						}
						.buttonStyle(.borderedProminent)
						.controlSize(.large)
						.padding()
						.accessibilityIdentifier("send-offline")
					}
				}
			}
			.navigationTitle(Strings.offlineScans)
			.navigationBarTitleDisplayMode(.inline)
			.toolbar {
				ToolbarItem(placement: .cancellationAction) {
					Button(Strings.close) { model.showOffline = false }.accessibilityIdentifier("close-offline")
				}
			}
		}
		.tint(Theme.tint)
		.presentationDetents([.medium, .large])
	}
}
