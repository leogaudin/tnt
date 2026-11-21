package com.tnt.scanner.data

import android.util.AtomicFile
import android.util.Log
import org.json.JSONArray
import java.io.File

/**
 * The scans waiting to be sent, kept in one JSON file. Every write replaces the file atomically, so a crash or a
 * killed app leaves either the old or the new queue, never half of one. Thread-safe: the UI and the background
 * sender share it.
 */
class ScanQueue(private val file: File) {
	private val lock = Any()
	private var scans: MutableList<Scan>? = null
	private val listeners = mutableListOf<() -> Unit>()

	fun addListener(listener: () -> Unit) = synchronized(lock) { listeners += listener }
	fun removeListener(listener: () -> Unit) = synchronized(lock) { listeners -= listener }

	fun all(): List<Scan> = synchronized(lock) { loaded().toList() }

	fun contains(key: String): Boolean = synchronized(lock) { loaded().any { it.key == key } }

	/** Adds scans, ignoring those already queued (same box and time). Returns whether anything was added. */
	fun addAll(added: List<Scan>): Boolean = update { current ->
		val known = current.mapTo(HashSet()) { it.key }
		current += added.filter { known.add(it.key) }
	}

	fun add(scan: Scan): Boolean = addAll(listOf(scan))

	/** Drops the scans with these keys. */
	fun remove(keys: Collection<String>): Boolean = update { current -> current.removeAll { it.key in keys } }

	fun markFailedPermanently(key: String): Boolean = update { current ->
		val index = current.indexOfFirst { it.key == key }
		if (index >= 0 && !current[index].failedPermanently) {
			current[index] = current[index].copy(failedPermanently = true)
			true
		} else false
	}

	private fun update(change: (MutableList<Scan>) -> Any?): Boolean {
		val notify: List<() -> Unit>
		synchronized(lock) {
			val current = loaded()
			val before = current.toList()
			change(current)
			if (current == before) return false
			write(current)
			notify = listeners.toList()
		}
		notify.forEach { it() }
		return true
	}

	private fun loaded(): MutableList<Scan> = scans ?: read().also { scans = it }

	private fun read(): MutableList<Scan> {
		if (!file.exists()) return mutableListOf()
		return try {
			val seen = HashSet<String>()
			Scan.listFromJson(JSONArray(String(AtomicFile(file).readFully(), Charsets.UTF_8))).filter { seen.add(it.key) }.toMutableList()
		} catch (e: Exception) {
			// Never delete what we cannot read: it may still be recoverable by hand.
			val aside = File(file.parentFile, "${file.name}.corrupt-${System.currentTimeMillis()}")
			Log.e(TAG, "Unreadable scan queue, moved to ${aside.name}", e)
			file.renameTo(aside)
			mutableListOf()
		}
	}

	private fun write(list: List<Scan>) {
		val atomic = AtomicFile(file)
		val out = atomic.startWrite()
		try {
			out.write(JSONArray(list.map { it.toQueueJson() }).toString().toByteArray(Charsets.UTF_8))
			atomic.finishWrite(out)
		} catch (e: Exception) {
			atomic.failWrite(out)
			throw e
		}
	}

	private companion object {
		const val TAG = "ScanQueue"
	}
}
