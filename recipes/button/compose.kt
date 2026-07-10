package com.saglitzdesign.recipes.button

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp

enum class SaglitzButtonVariant { PRIMARY, SECONDARY, DESTRUCTIVE }

// Material 3 button with variant hierarchy, disabled + loading states, and a
// 48dp minimum target. Press feedback uses a spring-driven scale.
@Composable
fun SaglitzButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: SaglitzButtonVariant = SaglitzButtonVariant.PRIMARY,
    isLoading: Boolean = false,
    enabled: Boolean = true,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.96f else 1f,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 400f),
        label = "buttonScale",
    )

    // Announce loading via stateDescription; keep the click blocked while busy.
    val a11y = Modifier.semantics {
        contentDescription = text
        if (isLoading) stateDescription = "Loading"
    }

    val content: @Composable () -> Unit = {
        Box(contentAlignment = Alignment.Center) {
            Text(text, modifier = Modifier.graphicsLayer { alpha = if (isLoading) 0f else 1f })
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.defaultMinSize(20.dp, 20.dp),
                    strokeWidth = 2.dp,
                    color = when (variant) {
                        SaglitzButtonVariant.SECONDARY -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onPrimary
                    },
                )
            }
        }
    }

    val sizedModifier = modifier
        .then(a11y)
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .defaultMinSize(minWidth = 64.dp, minHeight = 48.dp) // 48dp target

    when (variant) {
        SaglitzButtonVariant.SECONDARY ->
            OutlinedButton(
                onClick = onClick,
                enabled = enabled && !isLoading,
                interactionSource = interaction,
                modifier = sizedModifier,
                content = { content() },
            )
        else ->
            Button(
                onClick = onClick,
                enabled = enabled && !isLoading,
                interactionSource = interaction,
                colors = destructiveOrDefaultColors(variant),
                modifier = sizedModifier,
                content = { content() },
            )
    }
}

@Composable
private fun destructiveOrDefaultColors(variant: SaglitzButtonVariant): ButtonColors =
    if (variant == SaglitzButtonVariant.DESTRUCTIVE) {
        ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.error,
            contentColor = MaterialTheme.colorScheme.onError,
        )
    } else {
        ButtonDefaults.buttonColors()
    }
