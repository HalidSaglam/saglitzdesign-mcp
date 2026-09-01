package com.saglitzdesign.recipes.tooltip

import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Text
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// TooltipBox is the M3 tooltip. The icon button still has a content
// description — the tooltip supplements it, it does not replace it.
// Caret is part of PlainTooltip's shape, so the name is not colour alone.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaglitzTooltipButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tooltip: String = "Download CSV",
) {
    TooltipBox(
        modifier = modifier,
        positionProvider = TooltipDefaults.rememberTooltipPositionProvider(),
        tooltip = { PlainTooltip { Text(tooltip) } },
        state = rememberTooltipState(),
    ) {
        IconButton(
            onClick = onClick,
            modifier = Modifier.defaultMinSize(minHeight = 48.dp, minWidth = 48.dp),
        ) {
            Icon(Icons.Filled.Download, contentDescription = "Download CSV")
        }
    }
}
