package com.saglitzdesign.recipes.toast

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

enum class SaglitzToastKind { SUCCESS, ERROR, INFO }

// Snackbar-hosted toast. Never moves focus. Errors use LiveRegionMode.Assertive;
// success/info stay polite. Icon travels with the text so colour is not the
// only signal. Dismiss target is 48dp.

@Composable
fun SaglitzToastHost(
    hostState: SnackbarHostState,
    modifier: Modifier = Modifier,
) {
    SnackbarHost(hostState = hostState, modifier = modifier) { data ->
        val assertive = data.visuals.message.startsWith("Error:")
        Snackbar(
            modifier = Modifier.semantics {
                liveRegion = if (assertive) LiveRegionMode.Assertive else LiveRegionMode.Polite
            },
            action = {
                IconButton(
                    onClick = { data.dismiss() },
                    modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Dismiss notification")
                }
            },
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.padding(end = 8.dp),
            ) {
                Icon(
                    imageVector = when {
                        assertive -> Icons.Filled.Warning
                        data.visuals.message.startsWith("Saved") -> Icons.Filled.CheckCircle
                        else -> Icons.Filled.Info
                    },
                    contentDescription = null,
                    tint = if (assertive) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.primary,
                )
                Text(data.visuals.message, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
