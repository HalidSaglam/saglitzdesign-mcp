package com.saglitzdesign.recipes.breadcrumb

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

data class SaglitzCrumb(val id: String, val label: String)

@Composable
fun SaglitzBreadcrumb(
    items: List<SaglitzCrumb>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.semantics { contentDescription = "Breadcrumb" },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items.forEachIndexed { index, item ->
            if (index > 0) {
                Text("/", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            val last = index == items.lastIndex
            if (last) {
                Text(
                    item.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.semantics { selected = true },
                )
            } else {
                TextButton(
                    onClick = { onSelect(item.id) },
                    modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp),
                ) { Text(item.label) }
            }
        }
    }
}
