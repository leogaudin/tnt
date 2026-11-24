import Foundation
import Testing
@testable import TnT

struct LoginStoreTests {
	private func store() -> LoginStore {
		LoginStore(defaults: UserDefaults(suiteName: UUID().uuidString)!)
	}

	@Test func nothingIsStoredAtFirst() {
		#expect(store().get() == nil)
	}

	@Test func theLoginIsKept() {
		let store = store()
		store.set("+231770123456")
		#expect(store.get() == "+231770123456")
	}

	@Test func anEmptyLoginCountsAsNone() {
		let store = store()
		store.set("")
		#expect(store.get() == nil)
	}

	@Test func theKeyIsTheOneOfTheReactNativeApp() {
		#expect(LoginStore.key == "user_number")
	}
}
