import Foundation

/// The real clock for [Locator]: delayed calls on the main actor.
@MainActor
struct MainScheduler: Scheduler {
	func postDelayed(ms: Int64, _ action: @escaping @MainActor () -> Void) -> Cancel {
		let task = Task { @MainActor in
			try? await Task.sleep(for: .milliseconds(ms))
			if !Task.isCancelled { action() }
		}
		return { task.cancel() }
	}
}
