package com.saglitzdesign.recipes.pagination

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

// Finite short lists only. Long lists should use a cursor / "Load more".

@Composable
fun SaglitzPager(
    page: Int,
    pages: Int,
    onChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val numbers = linkedSetOf(1, minOf(2, pages), minOf(3, pages), pages).filter { it >= 1 }
    Row(
        modifier = modifier.semantics { contentDescription = "Pagination" },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(
            onClick = { onChange(page - 1) },
            enabled = page > 1,
            modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp),
        ) { Text("Previous") }
        numbers.forEach { n ->
            val selected = n == page
            val pageMod = Modifier
                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                .semantics {
                    this.role = Role.Button
                    this.selected = selected
                }
            if (selected) {
                Button(onClick = { onChange(n) }, modifier = pageMod) { Text("$n") }
            } else {
                FilledTonalButton(onClick = { onChange(n) }, modifier = pageMod) { Text("$n") }
            }
        }
        TextButton(
            onClick = { onChange(page + 1) },
            enabled = page < pages,
            modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp),
        ) { Text("Next") }
    }
}
