package com.tnt.scanner.scanner

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Test images are generated here: real box screenshots must not end up in the public repository. */
class QrDecoderTest {
	private class Image(val data: ByteArray, val width: Int, val height: Int)

	private fun qr(content: String, module: Int = 6, dark: Int = 0, light: Int = 255): Image {
		val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.MARGIN to 4))
		val width = matrix.width * module
		val height = matrix.height * module
		val data = ByteArray(width * height) { i ->
			val x = (i % width) / module
			val y = (i / width) / module
			(if (matrix.get(x, y)) dark else light).toByte()
		}
		return Image(data, width, height)
	}

	private fun Image.rotated(): Image {
		val out = ByteArray(data.size)
		for (y in 0 until height) for (x in 0 until width) out[x * height + (height - 1 - y)] = data[y * width + x]
		return Image(out, height, width)
	}

	/** A camera buffer has rows wider than the image. */
	private fun Image.withStride(stride: Int): Image {
		val out = ByteArray(stride * height)
		for (y in 0 until height) System.arraycopy(data, y * width, out, y * stride, width)
		return Image(out, stride, height).also { strideOf[it] = width }
	}

	private val strideOf = HashMap<Image, Int>()

	private fun decode(image: Image): String? {
		val width = strideOf[image] ?: image.width
		return QrDecoder().decode(image.data, image.width, width, image.height)
	}

	@Test
	fun `a tnt code is read`() {
		assertEquals("tnt://11sG0fpGBwU", decode(qr("tnt://11sG0fpGBwU")))
	}

	@Test
	fun `another code is read too, the filter is not its job`() {
		assertEquals("https://example.com", decode(qr("https://example.com")))
	}

	@Test
	fun `a code turned by 90 degrees is read`() {
		assertEquals("tnt://abc123", decode(qr("tnt://abc123").rotated()))
	}

	@Test
	fun `a low contrast code is read`() {
		assertEquals("tnt://abc123", decode(qr("tnt://abc123", dark = 90, light = 160)))
	}

	@Test
	fun `a small code is read`() {
		assertEquals("tnt://abc123", decode(qr("tnt://abc123", module = 3)))
	}

	@Test
	fun `rows padded beyond the image width are handled`() {
		assertEquals("tnt://abc123", decode(qr("tnt://abc123").withStride(qr("tnt://abc123").width + 24)))
	}

	@Test
	fun `a blank frame gives nothing`() {
		assertNull(QrDecoder().decode(ByteArray(320 * 240) { 128.toByte() }, 320, 320, 240))
	}

	@Test
	fun `a decoder keeps working after a blank frame`() {
		val decoder = QrDecoder()
		assertNull(decoder.decode(ByteArray(100 * 100), 100, 100, 100))
		val image = qr("tnt://abc123")
		assertEquals("tnt://abc123", decoder.decode(image.data, image.width, image.width, image.height))
	}
}
