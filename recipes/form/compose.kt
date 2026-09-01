package com.saglitzdesign.recipes.form

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

// Material 3 sign-up: labeled fields, one announced error, marketing checkbox off.

@Composable
fun SaglitzSignupForm(
    onSubmit: (email: String, company: String, password: String, updates: Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    var email by rememberSaveable { mutableStateOf("") }
    var company by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var updates by rememberSaveable { mutableStateOf(false) }
    var passwordError by rememberSaveable { mutableStateOf<String?>("Password must be at least 8 characters.") }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text("Create account", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Work email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
        )
        OutlinedTextField(
            value = company,
            onValueChange = { company = it },
            label = { Text("Company (optional)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            isError = passwordError != null,
            visualTransformation = PasswordVisualTransformation(),
            supportingText = passwordError?.let { { Text(it) } },
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 48.dp)
                .semantics { passwordError?.let { error(it) } },
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = updates, onCheckedChange = { updates = it })
            Text("Email me product updates. You can unsubscribe any time.")
        }
        Button(
            onClick = {
                passwordError = if (password.length < 8) "Password must be at least 8 characters." else null
                if (passwordError == null) onSubmit(email, company, password, updates)
            },
            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
        ) {
            Text("Create account")
        }
    }
}
