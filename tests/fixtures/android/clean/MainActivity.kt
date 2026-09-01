package com.ledger

import androidx.compose.material.icons.Icons
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun LedgerScreen() {
    Text("Ledger", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.primary)
    Button(onClick = {}) { Text("Save") }
}
