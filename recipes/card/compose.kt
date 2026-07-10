package com.saglitzdesign.recipes.card

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.weight
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.mergeDescendants
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

// Material 3 card with title / subtitle / trailing accessory. Tappable variant uses
// the clickable Card overload (built-in ripple + role). Uses tonal elevation — no
// competing border. Children merge into one accessibility node.
@Composable
fun SaglitzCard(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
) {
    val shape = MaterialTheme.shapes.large // one radius token
    val body: @Composable () -> Unit = {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis, // stable height in a grid
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            if (trailing != null) {
                Spacer(Modifier.weight(0f))
                trailing()
            }
        }
    }

    // Merge descendants so TalkBack reads the whole card as one element.
    val a11y = modifier.semantics(mergeDescendants = true) {}

    if (onClick != null) {
        Card(
            onClick = onClick,
            shape = shape,
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            modifier = a11y.fillMaxWidth(),
            content = { body() },
        )
    } else {
        Card(
            shape = shape,
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            modifier = a11y.fillMaxWidth(),
            content = { body() },
        )
    }
}
