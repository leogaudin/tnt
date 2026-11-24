import SwiftUI

/// A short message over everything, for 3 s, that does not block anything. Both lines stay fully visible.
struct ToastOverlay: View {
	let toast: Toast?

	var body: some View {
		VStack {
			if let toast {
				VStack(spacing: 2) {
					Text(toast.title).font(.subheadline.bold())
					Text(toast.text).font(.footnote).foregroundStyle(.secondary)
				}
				.multilineTextAlignment(.center)
				.padding(.horizontal, 20)
				.padding(.vertical, 12)
				.background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
				.shadow(color: .black.opacity(0.15), radius: 8, y: 2)
				.padding(.horizontal, 20)
				.padding(.top, 8)
				.transition(.move(edge: .top).combined(with: .opacity))
				.accessibilityElement(children: .combine)
				.accessibilityIdentifier("toast")
			}
			Spacer()
		}
		.allowsHitTesting(false)
		.animation(.easeInOut(duration: 0.2), value: toast)
	}
}
