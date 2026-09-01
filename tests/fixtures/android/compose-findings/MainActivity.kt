package com.ledger

import androidx.compose.material.Button
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp

@Composable
fun LedgerScreen() {
    Text("Ledger", fontSize = 17.sp, color = Color(0xFF1A73E8))
    Button(onClick = {}) { Text("Save") }
}
