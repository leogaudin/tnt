import groovy.json.JsonSlurper
import java.util.Properties

plugins {
	id("com.android.application")
	id("org.jetbrains.kotlin.android")
}

/**
 * Country selection. Everything country-specific comes from app/countries/<country>/ (shared with the React Native
 * app): config.json (applicationId, appName, apiUrl, colors) and android/res (icons).
 * Use ./assemble <release|debug> <country>, which passes -PtntCountry.
 */
val repoRoot = rootDir.parentFile
val countriesDir = File(repoRoot, "app/countries")
@Suppress("UNCHECKED_CAST")
fun readJson(file: File) = JsonSlurper().parse(file) as Map<String, Any?>

val tntCountry = (project.findProperty("tntCountry") as String?) ?: readJson(File(countriesDir, "default.json"))["country"] as String
val countryDir = File(countriesDir, tntCountry)
val countryConfigFile = File(countryDir, "config.json")
if (!countryConfigFile.exists()) {
	val available = countriesDir.listFiles { f -> f.isDirectory }!!.map { it.name }.sorted().joinToString(", ")
	throw GradleException("Unknown country '$tntCountry'. Available: $available")
}
val countryConfig = readJson(countryConfigFile)

@Suppress("UNCHECKED_CAST")
val colors = countryConfig["colors"] as Map<String, String>

// One version for every country: versionCode = major * 10000 + minor * 100 + patch, same rule as the React Native app.
val appVersion = readJson(File(rootDir, "version.json"))["version"] as String
val (vMajor, vMinor, vPatch) = appVersion.split(".").map { it.toInt() }
val appVersionCode = vMajor * 10000 + vMinor * 100 + vPatch

// Optional release signing: app/countries/<country>/signing.properties or $TNT_KEYSTORE_DIR/<country>.properties
// (storeFile, storePassword, keyAlias, keyPassword). Neither is committed. Without one, release builds use the
// debug keystore: every country is distributed as a sideloaded APK signed with it, and updates only install over
// an APK signed with the same key.
var signingFile = File(countryDir, "signing.properties")
if (!signingFile.exists() && System.getenv("TNT_KEYSTORE_DIR") != null) {
	signingFile = File(System.getenv("TNT_KEYSTORE_DIR"), "$tntCountry.properties")
}
val releaseSigning = if (signingFile.exists()) Properties().also { p -> signingFile.inputStream().use { p.load(it) } } else null

// Per-country icons; fall back to _default's when the country has none (one dir only: two dirs defining the same
// resource would fail the build).
var countryResDir = File(countryDir, "android/res")
if (!countryResDir.exists()) countryResDir = File(countriesDir, "_default/android/res")

android {
	namespace = "com.tnt.scanner"
	compileSdk = 35
	buildToolsVersion = "35.0.0"

	defaultConfig {
		applicationId = countryConfig["applicationId"] as String
		minSdk = 24
		targetSdk = 35
		versionCode = appVersionCode
		versionName = appVersion
		resValue("string", "app_name", countryConfig["appName"] as String)
		buildConfigField("String", "API_URL", "\"${countryConfig["apiUrl"]}\"")
		colors.forEach { (name, value) -> resValue("color", "tnt_$name", value) }
		// Only the language the app is written in: keeps the AppCompat/Material translations out of the APK.
		resourceConfigurations += listOf("en")
	}

	buildFeatures {
		viewBinding = true
		buildConfig = true
	}

	sourceSets["main"].res.srcDir(countryResDir)

	signingConfigs {
		getByName("debug") {
			storeFile = File(repoRoot, "app/android/app/debug.keystore")
			storePassword = "android"
			keyAlias = "androiddebugkey"
			keyPassword = "android"
		}
		if (releaseSigning != null) {
			create("release") {
				storeFile = file(releaseSigning.getProperty("storeFile"))
				storePassword = releaseSigning.getProperty("storePassword")
				keyAlias = releaseSigning.getProperty("keyAlias")
				keyPassword = releaseSigning.getProperty("keyPassword")
			}
		}
	}

	buildTypes {
		debug {
			signingConfig = signingConfigs.getByName("debug")
		}
		release {
			signingConfig = if (releaseSigning != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
			isMinifyEnabled = true
			isShrinkResources = true
			proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
		}
	}

	compileOptions {
		sourceCompatibility = JavaVersion.VERSION_17
		targetCompatibility = JavaVersion.VERSION_17
	}

	testOptions {
		unitTests.isIncludeAndroidResources = true
	}

	packaging {
		resources.excludes += listOf("META-INF/*.version", "META-INF/com/android/build/gradle/*", "DebugProbesKt.bin", "kotlin-tooling-metadata.json")
	}
}

kotlin {
	jvmToolchain(17)
}

dependencies {
	implementation("androidx.appcompat:appcompat:1.7.0")
	implementation("com.google.android.material:material:1.12.0")
	implementation("androidx.camera:camera-camera2:1.4.2")
	implementation("androidx.camera:camera-lifecycle:1.4.2")
	implementation("androidx.camera:camera-view:1.4.2")
	implementation("com.google.zxing:core:3.5.3")
	implementation("androidx.work:work-runtime:2.9.1")
	implementation("io.michaelrocks:libphonenumber-android:8.13.50")

	testImplementation("junit:junit:4.13.2")
	testImplementation("org.json:json:20240303")
	testImplementation("org.robolectric:robolectric:4.14.1")
	testImplementation("androidx.test:core:1.6.1")
	testImplementation("androidx.work:work-testing:2.9.1")
}
