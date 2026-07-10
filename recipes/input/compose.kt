package com.saglitzdesign.recipes.input

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

enum class SaglitzFieldKind { PLAIN, EMAIL, PASSWORD, PHONE }

// Material 3 text field: visible label, placeholder, accessible error, and the
// correct keyboard + autofill content type per kind. Scales with sp.
@Composable
fun SaglitzTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    kind: SaglitzFieldKind = SaglitzFieldKind.PLAIN,
    errorMessage: String? = null,
    enabled: Boolean = true,
) {
    val isError = errorMessage != null

    val keyboardOptions = when (kind) {
        SaglitzFieldKind.EMAIL -> KeyboardOptions(keyboardType = KeyboardType.Email)
        SaglitzFieldKind.PASSWORD -> KeyboardOptions(keyboardType = KeyboardType.Password)
        SaglitzFieldKind.PHONE -> KeyboardOptions(keyboardType = KeyboardType.Phone)
        SaglitzFieldKind.PLAIN -> KeyboardOptions.Default
    }
    val visualTransformation =
        if (kind == SaglitzFieldKind.PASSWORD) PasswordVisualTransformation()
        else VisualTransformation.None
    // Enables Autofill so the platform can offer saved credentials.
    val contentType = when (kind) {
        SaglitzFieldKind.EMAIL -> ContentType.EmailAddress
        SaglitzFieldKind.PASSWORD -> ContentType.Password
        SaglitzFieldKind.PHONE -> ContentType.PhoneNumber
        SaglitzFieldKind.PLAIN -> null
    }

    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            isError = isError,
            singleLine = true,
            label = { Text(label) },
            placeholder = { Text(placeholder) },
            keyboardOptions = keyboardOptions,
            visualTransformation = visualTransformation,
            supportingText = errorMessage?.let { { Text(it) } },
            trailingIcon = if (isError) {
                { Icon(Icons.Filled.Error, contentDescription = null) } // text carries the meaning
            } else null,
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 48.dp) // 48dp target
                .semantics {
                    // Wire Autofill + announce the error to accessibility services.
                    contentType?.let { this.contentType = it }
                    if (errorMessage != null) error(errorMessage)
                },
        )
    }
}
