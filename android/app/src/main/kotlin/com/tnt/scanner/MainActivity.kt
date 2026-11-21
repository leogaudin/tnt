package com.tnt.scanner

import android.Manifest
import android.app.Dialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.provider.Settings
import android.util.Size
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraInfoUnavailableException
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.net.toUri
import com.tnt.scanner.data.Scan
import com.tnt.scanner.databinding.ActivityMainBinding
import com.tnt.scanner.location.AndroidLocationSource
import com.tnt.scanner.location.LocationPermissions
import com.tnt.scanner.location.Locator
import com.tnt.scanner.location.MainScheduler
import com.tnt.scanner.scanner.CodeGate
import com.tnt.scanner.scanner.QrAnalyzer
import com.tnt.scanner.ui.LoginDialog
import com.tnt.scanner.ui.OfflineScansDialog
import com.tnt.scanner.ui.SendScanDialog
import com.tnt.scanner.ui.Toasts
import com.tnt.scanner.work.SendQueuedWorker
import io.michaelrocks.libphonenumber.android.PhoneNumberUtil
import java.util.concurrent.Executors

/** One screen with three states: permissions missing, scanner (login dialog on top until there is a login). */
class MainActivity : AppCompatActivity() {
	private lateinit var binding: ActivityMainBinding
	private val app get() = application as TntApplication
	private val gate = CodeGate(SystemClock::elapsedRealtime)
	private val analysisExecutor = Executors.newSingleThreadExecutor()
	private val locator by lazy { Locator(AndroidLocationSource(this), MainScheduler()) { locationPermissions() } }

	private var loginDialog: Dialog? = null
	private var sendDialog: SendScanDialog? = null
	private var offlineDialog: OfflineScansDialog? = null
	private var camera: Camera? = null
	private var torchOn = false

	private val requestPermissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
		getSharedPreferences("tnt", MODE_PRIVATE).edit().putBoolean(ASKED_KEY, true).apply()
		refresh()
	}

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		WindowCompat.setDecorFitsSystemWindows(window, false)
		binding = ActivityMainBinding.inflate(layoutInflater)
		setContentView(binding.root)

		ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, insets ->
			val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
			binding.topBar.setPadding(binding.topBar.paddingLeft, bars.top + dp(30), binding.topBar.paddingRight, 0)
			binding.poweredBy.setPadding(binding.poweredBy.paddingLeft, binding.poweredBy.paddingTop, binding.poweredBy.paddingRight, bars.bottom + dp(12))
			binding.permissions.setPadding(dp(30), bars.top + dp(30), dp(30), bars.bottom + dp(30))
			insets
		}
		binding.poweredBy.setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, getString(R.string.powered_by_url).toUri())) }
		binding.offlineButton.setOnClickListener { showOfflineScans() }
		binding.torchButton.setOnClickListener {
			torchOn = !torchOn
			camera?.cameraControl?.enableTorch(torchOn)
		}
		binding.permissionsButton.setOnClickListener { onPermissionsButton() }

		if (!hasRequiredPermissions()) requestPermissions.launch(REQUIRED_PERMISSIONS)
		refresh()
		// Scans left from an earlier session: let them go out as soon as there is a network.
		app.io.execute { if (app.queue.all().any { !it.failedPermanently }) SendQueuedWorker.schedule(applicationContext) }
	}

	override fun onResume() {
		super.onResume()
		// Back from the system settings page, where the permissions may have been granted.
		refresh()
	}

	override fun onStop() {
		// The camera is released by its lifecycle binding; the torch goes off with it.
		torchOn = false
		super.onStop()
	}

	override fun onDestroy() {
		sendDialog?.dismiss()
		offlineDialog?.dismiss()
		loginDialog?.dismiss()
		analysisExecutor.shutdown()
		super.onDestroy()
	}

	private fun refresh() {
		showLoginIfNeeded()
		val granted = hasRequiredPermissions()
		binding.permissions.visibility = if (granted) View.GONE else View.VISIBLE
		if (granted) startCamera() else binding.poweredBy.visibility = View.GONE
	}

	private fun showLoginIfNeeded() {
		if (app.login.get() != null || loginDialog != null) return
		val util = PhoneNumberUtil.createInstance(this)
		loginDialog = LoginDialog(this, util) { number ->
			app.login.set(number)
			loginDialog = null
		}.dialog.also { it.show() }
	}

	private fun startCamera() {
		if (camera != null) return
		val future = ProcessCameraProvider.getInstance(this)
		future.addListener({
			if (camera != null || isDestroyed) return@addListener
			val provider = future.get()
			val hasBack = try {
				provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)
			} catch (e: CameraInfoUnavailableException) {
				false
			}
			binding.poweredBy.visibility = View.VISIBLE
			if (!hasBack) {
				binding.noCamera.visibility = View.VISIBLE
				return@addListener
			}
			val preview = Preview.Builder().build().also { it.setSurfaceProvider(binding.preview.surfaceProvider) }
			val analysis = ImageAnalysis.Builder()
				.setResolutionSelector(ResolutionSelector.Builder()
					.setResolutionStrategy(ResolutionStrategy(Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER))
					.build())
				.setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
				.build()
				.also { it.setAnalyzer(analysisExecutor, QrAnalyzer { content -> runOnUiThread { onCode(content) } }) }
			provider.unbindAll()
			camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
			binding.preview.visibility = View.VISIBLE
			binding.overlay.visibility = View.VISIBLE
		}, ContextCompat.getMainExecutor(this))
	}

	private fun onCode(content: String) {
		val login = app.login.get() ?: return
		val boxId = gate.accept(content, dialogOpen = sendDialog != null || loginDialog != null) ?: return
		sendDialog = SendScanDialog(this, boxId, locator, login, ::submit) { sendDialog = null }.also { it.show() }
	}

	private fun submit(scan: Scan) {
		val context = applicationContext
		app.io.execute {
			val sent = app.repository.submit(scan)
			runOnUiThread {
				if (sent) Toasts.show(context, getString(R.string.toast_success), getString(R.string.toast_success_text))
				else Toasts.show(context, getString(R.string.toast_saved_offline), getString(R.string.toast_saved_offline_text))
			}
			if (!sent) SendQueuedWorker.schedule(context)
		}
	}

	private fun showOfflineScans() {
		if (offlineDialog != null) return
		offlineDialog = OfflineScansDialog(this, app.queue, ::sendOfflineScans) { offlineDialog = null }.also { it.show() }
	}

	private fun sendOfflineScans() {
		val context = applicationContext
		app.io.execute {
			val report = app.repository.sendQueued(includePermanentFailures = true) {
				runOnUiThread { Toasts.show(context, getString(R.string.toast_success), getString(R.string.toast_success_text)) }
			}
			if (report.failed > 0) runOnUiThread {
				Toasts.show(context, getString(R.string.toast_offline_error), getString(R.string.toast_offline_error_text))
			}
		}
	}

	private fun granted(permission: String) = ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

	/** Approximate location is enough: users who refuse the precise one must still be able to work. */
	private fun locationPermissions() = LocationPermissions(
		fine = granted(Manifest.permission.ACCESS_FINE_LOCATION),
		coarse = granted(Manifest.permission.ACCESS_COARSE_LOCATION),
	)

	private fun hasRequiredPermissions() = granted(Manifest.permission.CAMERA) && locationPermissions().any

	private fun onPermissionsButton() {
		val asked = getSharedPreferences("tnt", MODE_PRIVATE).getBoolean(ASKED_KEY, false)
		val blocked = REQUIRED_PERMISSIONS.any { !granted(it) && !shouldShowRequestPermissionRationale(it) }
		// Once the system stops showing its prompt the only way left is the app's settings page.
		if (asked && blocked) {
			startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
		} else {
			requestPermissions.launch(REQUIRED_PERMISSIONS)
		}
	}

	private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

	private companion object {
		const val ASKED_KEY = "asked_permissions"
		val REQUIRED_PERMISSIONS = arrayOf(
			Manifest.permission.ACCESS_FINE_LOCATION,
			Manifest.permission.ACCESS_COARSE_LOCATION,
			Manifest.permission.CAMERA,
		)
	}
}
