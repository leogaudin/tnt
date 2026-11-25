import groovy.json.JsonSlurper
import java.util.Properties

plugins {
	id("com.android.application")
	id("org.jetbrains.kotlin.android")
}

/**
 * Country selection. Everything country-specific comes from mobile/countries/<country>/ (shared with the iOS app):
 * config.json (applicationId, appName, apiUrl, colors) and android/res (icons).
 * Use ./assemble <release|debug> <country>, which passes -PtntCountry.
 */
val repoRoot = rootDir.parentFile
val countriesDir = File(repoRoot, "mobile/countries")
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

// Texts: mobile/strings/<language>.json (shared with iOS) for the country's language, English where a text is missing,
// then the country's own `strings` overrides. Written as the app's only string resources, so the app is always in the
// country's language whatever the phone's.
val appLanguage = (countryConfig["language"] as String?) ?: "en"
@Suppress("UNCHECKED_CAST")
val texts = (readJson(File(repoRoot, "mobile/strings/en.json")) as Map<String, String>) +
	(if (appLanguage == "en") emptyMap() else readJson(File(repoRoot, "mobile/strings/$appLanguage.json")) as Map<String, String>) +
	((countryConfig["strings"] as Map<String, String>?) ?: emptyMap())
val generatedResDir = layout.buildDirectory.dir("generated/tnt/res")
val generateTexts by tasks.registering {
	inputs.property("texts", texts)
	outputs.dir(generatedResDir)
	doLast {
		val xml = texts.entries.joinToString("\n", "<resources>\n", "\n</resources>\n") { (key, text) ->
			val name = key.replace(Regex("([A-Z])")) { "_" + it.value.lowercase() }
			val value = text.replace("{id}", "%1\$s")
				.replace("&", "&amp;").replace("<", "&lt;").replace("'", "\\'").replace("\"", "\\\"")
			"\t<string name=\"$name\">$value</string>"
		}
		generatedResDir.get().asFile.resolve("values").also { it.mkdirs() }.resolve("tnt_strings.xml").writeText(xml)
	}
}

// One version for every country: versionCode = major * 10000 + minor * 100 + patch, the same number as the iOS build.
val appVersion = readJson(File(rootDir, "version.json"))["version"] as String
val (vMajor, vMinor, vPatch) = appVersion.split(".").map { it.toInt() }
val appVersionCode = vMajor * 10000 + vMinor * 100 + vPatch

// Optional release signing: mobile/countries/<country>/signing.properties or $TNT_KEYSTORE_DIR/<country>.properties
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
		// Only the language the country is written in: keeps the AppCompat/Material translations out of the APK.
		resourceConfigurations += listOf(appLanguage)
	}

	buildFeatures {
		viewBinding = true
		buildConfig = true
	}

	sourceSets["main"].res.srcDirs(countryResDir)
	sourceSets["main"].res.srcDir(generatedResDir)

	signingConfigs {
		getByName("debug") {
			storeFile = file("debug.keystore")
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

// Before anything reads the resources (merge, lint, tests), even after a clean.
tasks.named("preBuild") { dependsOn(generateTexts) }

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
