package com.saglitzdesign.recipes.skeleton

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

// Static placeholders in the same slots as the loaded rows. No infinite animation.

@Composable
fun SaglitzInvoiceSkeleton(modifier: Modifier = Modifier) {
    val fill = MaterialTheme.colorScheme.surfaceVariant
    val shape = RoundedCornerShape(10.dp)
    Column(
        modifier = modifier.semantics { contentDescription = "Loading invoices" },
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .width(120.dp)
                .height(16.dp)
                .clip(shape)
                .background(fill),
        )
        repeat(3) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 48.dp)
                    .height(48.dp)
                    .clip(shape)
                    .background(fill),
            )
        }
    }
}
