import Testing
@testable import TnT

struct AppConfigTests {
	@Test func readsTheCountrySettingsFromInfoPlist() {
		let config = AppConfig(info: ["TntApiUrl": "https://api.example/api", "TntColors": ["main": "00205B"]])
		#expect(config.apiUrl == "https://api.example/api")
		#expect(config.colors["main"] == "00205B")
	}
}
