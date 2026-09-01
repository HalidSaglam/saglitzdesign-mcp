package com.saglitzdesign.recipes.navigation

import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

data class SaglitzNavDest(
    val id: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

// Compact NavigationBar. Use NavigationRail at medium width with the same
// destinations in the same order — never both at once. 48dp items.
// Active indicator is the M3 pill (shape), not colour alone.

@Composable
fun SaglitzNavBar(
    destinations: List<SaglitzNavDest>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(modifier) {
        destinations.forEach { dest ->
            val selected = dest.id == selectedId
            NavigationBarItem(
                selected = selected,
                onClick = { onSelect(dest.id) },
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                icon = {
                    Icon(
                        imageVector = if (selected) dest.selectedIcon else dest.unselectedIcon,
                        contentDescription = dest.label,
                    )
                },
                label = { Text(dest.label) },
                alwaysShowLabel = true,
            )
        }
    }
}

@Composable
fun SaglitzNavBarPreview() {
    SaglitzNavBar(
        destinations = listOf(
            SaglitzNavDest("home", "Home", Icons.Filled.Home, Icons.Outlined.Home),
            SaglitzNavDest("inbox", "Inbox", Icons.Filled.Inbox, Icons.Outlined.Inbox),
            SaglitzNavDest("settings", "Settings", Icons.Filled.Settings, Icons.Outlined.Settings),
        ),
        selectedId = "home",
        onSelect = {},
    )
}
