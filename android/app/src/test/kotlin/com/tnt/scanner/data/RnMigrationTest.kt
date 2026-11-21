package com.tnt.scanner.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

@RunWith(RobolectricTestRunner::class)
class RnMigrationTest {
	private val context get() = ApplicationProvider.getApplicationContext<Context>()
	private lateinit var db: File
	private lateinit var unparsed: File
	private lateinit var queue: ScanQueue
	private lateinit var login: LoginStore
	private val prefs get() = context.getSharedPreferences("migration-test", Context.MODE_PRIVATE)

	@Before
	fun setUp() {
		db = File(context.filesDir, "RKStorage-test").also { it.delete() }
		unparsed = File(context.filesDir, "unparsed-test.json").also { it.delete() }
		File(context.filesDir, "migration-queue.json").delete()
		prefs.edit().clear().commit()
		queue = ScanQueue(File(context.filesDir, "migration-queue.json"))
		login = LoginStore(prefs)
	}

	/** The schema of AsyncStorage's legacy (RKStorage) SQLite storage. */
	private fun createStorage(vararg rows: Pair<String, String>) {
		val database = SQLiteDatabase.openOrCreateDatabase(db, null)
		database.execSQL("CREATE TABLE catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
		for ((k, v) in rows) database.execSQL("INSERT INTO catalystLocalStorage VALUES (?, ?)", arrayOf(k, v))
		database.close()
	}

	private fun migration() = RnMigration(db, unparsed, prefs, login, queue)

	@Test
	fun `login and every queued scan come over`() {
		createStorage("user_number" to "+231770123456", "offline_scans" to Fixtures.rnScans().toString())
		migration().run()
		assertEquals("+231770123456", login.get())
		assertEquals(listOf("11sG0fpGBwU", "abc123"), queue.all().map { it.boxId })
		assertTrue(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `what the server receives is what the React Native app would have sent`() {
		createStorage("offline_scans" to Fixtures.rnScans().toString())
		migration().run()
		val original = Fixtures.rnScans().getJSONObject(1)
		val sent = queue.all()[1].toServerJson()
		assertEquals(original.getString("boxId"), sent.getString("boxId"))
		assertEquals(original.getLong("time"), sent.getLong("time"))
		assertEquals(original.getString("comment"), sent.getString("comment"))
		assertEquals(original.getBoolean("markedAsReceived"), sent.getBoolean("markedAsReceived"))
		assertEquals(
			original.getJSONObject("location").getJSONObject("coords").getDouble("accuracy"),
			sent.getJSONObject("location").getJSONObject("coords").getDouble("accuracy"), 0.0,
		)
	}

	@Test
	fun `the old storage is left untouched`() {
		createStorage("user_number" to "+231770123456", "offline_scans" to Fixtures.rnScans().toString())
		val before = db.readBytes()
		migration().run()
		assertTrue(db.exists())
		assertTrue(before.contentEquals(db.readBytes()))
	}

	@Test
	fun `the native login wins, native queue wins on duplicates, other scans are merged`() {
		login.set("+33742424242")
		val native = Fixtures.scan("11sG0fpGBwU", 1763700000000, comment = "native copy")
		queue.add(native)
		createStorage("user_number" to "+231770123456", "offline_scans" to Fixtures.rnScans().toString())
		migration().run()
		assertEquals("+33742424242", login.get())
		assertEquals(2, queue.all().size)
		assertEquals("native copy", queue.all().first { it.boxId == "11sG0fpGBwU" }.comment)
	}

	@Test
	fun `duplicates inside the old queue are imported once`() {
		val one = Fixtures.scan("a", 1).toQueueJson()
		createStorage("offline_scans" to JSONArray(listOf(one, one)).toString())
		migration().run()
		assertEquals(1, queue.all().size)
	}

	@Test
	fun `it runs once, so later launches do not bring back scans that were sent since`() {
		createStorage("offline_scans" to Fixtures.rnScans().toString())
		migration().run()
		queue.remove(queue.all().map { it.key })
		migration().run()
		assertEquals(0, queue.all().size)
	}

	@Test
	fun `fresh install without old storage`() {
		migration().run()
		assertEquals(null, login.get())
		assertEquals(0, queue.all().size)
		assertTrue(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `old storage without our keys`() {
		createStorage("something_else" to "x")
		migration().run()
		assertEquals(null, login.get())
		assertEquals(0, queue.all().size)
		assertTrue(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `empty old queue`() {
		createStorage("user_number" to "+231770123456", "offline_scans" to "[]")
		migration().run()
		assertEquals("+231770123456", login.get())
		assertEquals(0, queue.all().size)
		assertTrue(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `corrupt old queue changes nothing, keeps the flag unset, and does not throw`() {
		createStorage("user_number" to "+231770123456", "offline_scans" to "[{\"boxId\": ")
		migration().run()
		assertFalse(prefs.getBoolean(RnMigration.DONE_KEY, false))
		assertEquals(0, queue.all().size)
		assertTrue(db.exists())
	}

	@Test
	fun `a file that is not a database keeps the flag unset and does not throw`() {
		db.writeText("this is not sqlite")
		migration().run()
		assertFalse(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `a scan that cannot be read is set aside, the others come over`() {
		val good = Fixtures.scan("good", 1).toQueueJson()
		val bad = org.json.JSONObject().put("boxId", "bad").put("time", 2)
		createStorage("offline_scans" to JSONArray(listOf(good, bad)).toString())
		migration().run()
		assertEquals(listOf("good"), queue.all().map { it.boxId })
		assertTrue(unparsed.readText().contains("\"bad\""))
		assertTrue(prefs.getBoolean(RnMigration.DONE_KEY, false))
	}

	@Test
	fun `a login that was stored empty is not imported`() {
		createStorage("user_number" to "")
		migration().run()
		assertEquals(null, login.get())
	}
}
