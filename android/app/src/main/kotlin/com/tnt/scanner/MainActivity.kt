package com.tnt.scanner

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		setContentView(TextView(this).apply {
			text = getString(R.string.app_name)
			setTextColor(getColor(R.color.tnt_main))
		})
	}
}
