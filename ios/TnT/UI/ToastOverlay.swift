import SwiftUI

/// A short message over everything, for 3 s, that does not block anything. Both lines stay fully visible.
struct ToastOverlay: View {
	let toast: Toast?

	var body: some View {
		VStack {
			if let toast {
				VStack(spacing: 2) {
					Text(toast.title).font(.system(size: 15, weight: .bold))
					Text(toast.text).font(.system(size: 14))
				}
				.multilineTextAlignment(.center)
				.foregroundStyle(.white)
				.padding(.horizontal, 16)
				.padding(.vertical, 10)
				.background(RoundedRectangle(cornerRadius: 12).fill(Color.black.opacity(0.85)))
				.padding(.horizontal, 20)
				.padding(.top, 60)
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
