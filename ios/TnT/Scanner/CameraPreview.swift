import AVFoundation
import SwiftUI

/// The camera picture, filling the screen.
struct CameraPreview: UIViewRepresentable {
	let session: AVCaptureSession

	func makeUIView(context: Context) -> PreviewView {
		let view = PreviewView()
		view.previewLayer.videoGravity = .resizeAspectFill
		view.previewLayer.session = session
		return view
	}

	func updateUIView(_ view: PreviewView, context: Context) {}

	final class PreviewView: UIView {
		override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
		var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }

		override func layoutSubviews() {
			super.layoutSubviews()
			// The app is portrait only.
			previewLayer.connection?.videoRotationAngle = 90
		}
	}
}
