package com.saglitzdesign.recipes.select

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class SaglitzOption(val id: String, val label: String)

// ExposedDropdownMenuBox is the M3 combobox. The field is labelled; error is
// supporting text plus isError, not a red border alone. 48dp target.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaglitzSelect(
    label: String,
    options: List<SaglitzOption>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.id == selectedId }
    Column(modifier) {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { if (enabled) expanded = it },
        ) {
            OutlinedTextField(
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    .defaultMinSize(minHeight = 48.dp),
                readOnly = true,
                value = selected?.label.orEmpty(),
                onValueChange = {},
                label = { Text(label) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                isError = error != null,
                supportingText = error?.let { { Text(it) } },
                enabled = enabled,
                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option.label, style = MaterialTheme.typography.bodyLarge) },
                        onClick = {
                            onSelect(option.id)
                            expanded = false
                        },
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                    )
                }
            }
        }
    }
}
