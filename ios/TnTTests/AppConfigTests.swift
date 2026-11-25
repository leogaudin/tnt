import Testing
@testable import TnT

struct AppConfigTests {
	@Test func readsTheCountrySettingsFromInfoPlist() {
		let config = AppConfig(info: ["TntApiUrl": "https://api.example/api", "TntColors": ["main": "00205B"]])
		#expect(config.apiUrl == "https://api.example/api")
		#expect(config.colors["main"] == "00205B")
	}
}

struct CountryTextTests {
	@Test func aCountryIsWrittenInEnglishUnlessItSaysOtherwise() {
		let config = AppConfig(info: [:])
		#expect(config.language == "en")
		#expect(config.stringOverrides.isEmpty)
		#expect(AppConfig(info: ["TntLanguage": ""]).language == "en")
	}

	@Test func readsTheLanguageAndTheOverridesFromInfoPlist() {
		let config = AppConfig(info: ["TntLanguage": "fr", "TntStringOverrides": #"{"markAsReceived":"Reçue"}"#])
		#expect(config.language == "fr")
		#expect(config.stringOverrides == ["markAsReceived": "Reçue"])
		#expect(AppConfig(info: ["TntStringOverrides": "not json"]).stringOverrides.isEmpty)
	}

	@Test func theFrenchTableTranslatesEverythingTheEnglishOneSays() {
		let en = Strings.table(language: "en", overrides: [:])
		let fr = Strings.table(language: "fr", overrides: [:])
		#expect(!en.isEmpty)
		#expect(Set(fr.keys) == Set(en.keys))
		for (key, text) in en where !text.isEmpty { #expect(fr[key] != text || key == "location" || key == "toastLocation", "\(key) is not translated") }
		#expect(fr["login"] == "Connexion")
	}

	@Test func anOverrideWinsOverTheLanguageAndOnlyForItsKey() {
		let plain = Strings.table(language: "en", overrides: [:])
		let liberia = Strings.table(language: "en", overrides: ["markAsReceived": "Mark as received (Principal only)"])
		#expect(plain["markAsReceived"] == "Mark as received (HT only)")
		#expect(liberia["markAsReceived"] == "Mark as received (Principal only)")
		#expect(liberia["send"] == plain["send"])
	}

	@Test func aLanguageWithoutAFileFallsBackToEnglish() {
		#expect(Strings.table(language: "xx", overrides: [:]) == Strings.table(language: "en", overrides: [:]))
	}

	@Test func theBoxTitleTakesTheBoxId() {
		#expect(Strings.boxTitle("abc") == "Box n°abc")
	}
}
