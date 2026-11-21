package com.tnt.scanner.scanner

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.zxing.BinaryBitmap
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.ReaderException
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader

/** QR codes only, from the luminance (Y) plane of a camera frame: pure Java, no Play Services, no native code. */
class QrDecoder {
	private val reader = QRCodeReader()

	/** @param luminance rows of [rowStride] bytes, [width] of them used */
	fun decode(luminance: ByteArray, rowStride: Int, width: Int, height: Int): String? = try {
		val source = PlanarYUVLuminanceSource(luminance, rowStride, height, 0, 0, width, height, false)
		reader.decode(BinaryBitmap(HybridBinarizer(source))).text
	} catch (e: ReaderException) {
		null
	} finally {
		reader.reset()
	}
}

class QrAnalyzer(private val onCode: (String) -> Unit) : ImageAnalysis.Analyzer {
	private val decoder = QrDecoder()

	override fun analyze(image: ImageProxy) {
		try {
			val plane = image.planes[0]
			val buffer = plane.buffer
			// The last row of the buffer may be shorter than a full stride.
			val data = ByteArray(maxOf(buffer.remaining(), plane.rowStride * image.height))
			buffer.get(data, 0, buffer.remaining())
			decoder.decode(data, plane.rowStride, image.width, image.height)?.let(onCode)
		} finally {
			image.close()
		}
	}
}
