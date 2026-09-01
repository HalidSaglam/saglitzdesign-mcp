package com.saglitzdesign.recipes.badge

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class SaglitzBadgeTone { NEUTRAL, ACCENT, DANGER }

@Composable
fun SaglitzBadge(
    label: String,
    modifier: Modifier = Modifier,
    tone: SaglitzBadgeTone = SaglitzBadgeTone.NEUTRAL,
    count: Int? = null,
) {
    val (container, content) = when (tone) {
        SaglitzBadgeTone.NEUTRAL -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
        SaglitzBadgeTone.ACCENT -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        SaglitzBadgeTone.DANGER -> MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
    }
    Surface(
        modifier = modifier,
        color = container,
        contentColor = content,
        shape = RoundedCornerShape(9999.dp),
    ) {
        Row(
            Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(label, style = MaterialTheme.typography.labelLarge)
            if (count != null) {
                Text("$count", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
