import Foundation

/// Every text of the app, verbatim from the React Native and Android apps: the field teams know these words.
enum Strings {
	static let permissionsNeeded = "This application needs access to the camera and location to launch. Please allow access to both and restart."
	static let checkPermissionsAgain = "Check permissions again"
	static let enterPhoneNumber = "Enter your phone number"
	static let login = "Login"
	static let noCamera = "No camera was found on this device, so boxes cannot be scanned."
	// Attribution notice required by the additional terms in LICENSE (AGPL-3.0 section 7(b)). Do not remove or hide.
	static let poweredBy = "Powered by TnT (Track-and-Trace)"
	static let poweredByURL = "https://github.com/leogaudin/tnt"
	static func boxTitle(_ id: String) -> String { "Box n°\(id)" }
	static let location = "Location"
	static let determining = "Determining..."
	static let retry = "Retry"
	static let addComment = "Add a comment..."
	static let markAsReceived = "Mark as received (HT only)"
	static let cancel = "Cancel"
	static let send = "Send"
	static let offlineScans = "Offline scans"
	static let noOfflineScans = "No offline scans"
	static let sendOfflineScans = "Send offline scans"
	static let close = "Close"
	static let toastSuccess = "Success!"
	static let toastSuccessText = "Scan sent successfully"
	static let toastSavedOffline = "Scan saved offline"
	static let toastSavedOfflineText = "Send it later from the offline scans list"
	static let toastOfflineError = "Error sending offline data"
	static let toastOfflineErrorText = "Offline data will be sent when connection is restored"
	static let toastLocation = "Location"
	static let flashlight = "Flashlight"
}
