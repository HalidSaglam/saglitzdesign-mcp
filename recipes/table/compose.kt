package com.saglitzdesign.recipes.table

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

data class SaglitzInvoice(
    val id: String,
    val name: String,
    val status: String,
    val amount: String,
)

// A phone "table" is a list of rows. Selection is a check icon (shape) plus
// semantics, not a tint. 48dp rows. Empty is a first-class composition.

@Composable
fun SaglitzInvoiceTable(
    invoices: List<SaglitzInvoice>,
    selectedId: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (invoices.isEmpty()) {
        Text(
            "No invoices yet.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = modifier.padding(16.dp),
        )
        return
    }
    LazyColumn(modifier) {
        items(invoices, key = { it.id }) { invoice ->
            val selected = invoice.id == selectedId
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 48.dp)
                    .clickable { onSelect(invoice.id) }
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .semantics { this.selected = selected },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(invoice.name, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        invoice.status,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(invoice.amount, style = MaterialTheme.typography.bodyLarge)
                if (selected) {
                    Icon(
                        Icons.Filled.Check,
                        contentDescription = "Selected",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            HorizontalDivider()
        }
    }
}
