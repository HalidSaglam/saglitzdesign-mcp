package com.saglitzdesign.recipes.tabs

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.defaultMinSize

data class SaglitzTab(
    val id: String,
    val label: String,
    val enabled: Boolean = true,
)

// Material 3 PrimaryTabRow. The indicator is a 3dp bar (shape, not colour
// alone). Tabs meet the 48dp target. Arrow-key traversal is the TabRow default.

@Composable
fun SaglitzTabs(
    tabs: List<SaglitzTab>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (String) -> Unit,
) {
    val selectedIndex = tabs.indexOfFirst { it.id == selectedId }.coerceAtLeast(0)
    Column(modifier) {
        PrimaryTabRow(selectedTabIndex = selectedIndex) {
            tabs.forEach { tab ->
                Tab(
                    selected = tab.id == selectedId,
                    onClick = { if (tab.enabled) onSelect(tab.id) },
                    enabled = tab.enabled,
                    modifier = Modifier
                        .defaultMinSize(minHeight = 48.dp)
                        .semantics { selected = tab.id == selectedId },
                    text = { Text(tab.label, style = MaterialTheme.typography.labelLarge) },
                )
            }
        }
        content(selectedId)
    }
}
