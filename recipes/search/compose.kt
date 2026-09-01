package com.saglitzdesign.recipes.search

import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DockedSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// Material 3 DockedSearchBar. Placeholder is not the label — `placeholder`
// is visual; the search semantics come from SearchBar. Clear appears once
// the query is non-empty. Predictive back collapses the expanded view.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaglitzSearch(
    query: String,
    onQueryChange: (String) -> Unit,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search invoices",
    content: @Composable () -> Unit,
) {
    DockedSearchBar(
        modifier = modifier.fillMaxWidth(),
        inputField = {
            SearchBarDefaults.InputField(
                query = query,
                onQueryChange = onQueryChange,
                onSearch = { onExpandedChange(false) },
                expanded = expanded,
                onExpandedChange = onExpandedChange,
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                placeholder = { Text(placeholder) },
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = null)
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(
                            onClick = { onQueryChange("") },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp, minWidth = 48.dp),
                        ) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear")
                        }
                    }
                },
            )
        },
        expanded = expanded,
        onExpandedChange = onExpandedChange,
        content = { content() },
    )
}
