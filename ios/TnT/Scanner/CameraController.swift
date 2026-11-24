@preconcurrency import AVFoundation
import UIKit

/// The back camera reading QR codes. The session runs on its own queue: `startRunning` blocks.
@MainActor
final class CameraController: NSObject, AVCaptureMetadataOutputObjectsDelegate {
	nonisolated(unsafe) let session = AVCaptureSession()
	private let sessionQueue = DispatchQueue(label: "com.tnt.scanner.camera")
	private let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
	private var configured = false
	var onCode: @MainActor (String) -> Void = { _ in }

	/// False on a phone with no back camera (and in the simulator).
	var isAvailable: Bool { device != nil }
	var hasTorch: Bool { device?.hasTorch ?? false }

	private func configure() {
		guard !configured, let device, let input = try? AVCaptureDeviceInput(device: device) else { return }
		configured = true
		session.beginConfiguration()
		// QR codes do not need more, and a smaller picture is cheaper on old phones.
		session.sessionPreset = .hd1280x720
		if session.canAddInput(input) { session.addInput(input) }
		let output = AVCaptureMetadataOutput()
		if session.canAddOutput(output) {
			session.addOutput(output)
			output.setMetadataObjectsDelegate(self, queue: .main)
			output.metadataObjectTypes = [.qr]
		}
		session.commitConfiguration()
	}

	func start() {
		configure()
		guard configured else { return }
		let session = session
		sessionQueue.async { if !session.isRunning { session.startRunning() } }
	}

	func stop() {
		setTorch(false)
		let session = session
		sessionQueue.async { if session.isRunning { session.stopRunning() } }
	}

	func setTorch(_ on: Bool) {
		guard let device, device.hasTorch, (try? device.lockForConfiguration()) != nil else { return }
		device.torchMode = on ? .on : .off
		device.unlockForConfiguration()
	}

	nonisolated func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
		let codes = objects.compactMap { ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue }
		MainActor.assumeIsolated {
			for code in codes { onCode(code) }
		}
	}
}
