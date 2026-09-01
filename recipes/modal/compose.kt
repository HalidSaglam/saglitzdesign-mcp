package com.saglitzdesign.recipes.modal

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

// Material 3 AlertDialog. One primary action on the trailing edge; Escape /
// system back maps to onDismiss. Destructive dialogs pass dismissOnBackdrop
// = false so a scrim tap cannot discard work.

@Composable
fun SaglitzModal(
    title: String,
    onDismiss: () -> Unit,
    primaryLabel: String,
    onPrimary: () -> Unit,
    modifier: Modifier = Modifier,
    body: String? = null,
    secondaryLabel: String = "Cancel",
    dismissOnBackdrop: Boolean = true,
    destructive: Boolean = false,
) {
    AlertDialog(
        onDismissRequest = { if (dismissOnBackdrop) onDismiss() },
        modifier = modifier.semantics { paneTitle = title },
        title = { Text(title, style = MaterialTheme.typography.headlineSmall) },
        text = body?.let { { Text(it, style = MaterialTheme.typography.bodyMedium) } },
        confirmButton = {
            TextButton(
                onClick = onPrimary,
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
            ) {
                Text(
                    primaryLabel,
                    color = if (destructive) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.primary,
                )
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
            ) { Text(secondaryLabel) }
        },
    )
}

@Composable
fun SaglitzModalPreviewRow() {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth()) {
            Text("Preview host — call SaglitzModal from a DialogHost.")
        }
    }
}
