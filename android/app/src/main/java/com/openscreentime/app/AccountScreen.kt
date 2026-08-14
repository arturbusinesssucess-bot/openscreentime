package com.openscreentime.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun todayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

@Composable
fun AccountScreen(todayUsage: List<AppUsageEntry>, onAuthChanged: () -> Unit = {}) {
    val scope = rememberCoroutineScope()
    var signedIn by remember { mutableStateOf(SyncRepository.isSignedIn()) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var statusMessage by remember { mutableStateOf("") }
    var remoteRows by remember { mutableStateOf(listOf<RemoteUsageRow>()) }

    if (!signedIn) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                "Entre com uma conta pra sincronizar o uso do celular com o desktop.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("e-mail") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("senha") },
                visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = {
                    scope.launch {
                        try {
                            SyncRepository.signIn(email, password)
                            signedIn = true
                            onAuthChanged()
                        } catch (e: Exception) {
                            statusMessage = e.message ?: "Erro ao entrar"
                        }
                    }
                }) {
                    Text("Entrar")
                }
                OutlinedButton(onClick = {
                    scope.launch {
                        try {
                            SyncRepository.signUp(email, password)
                            signedIn = SyncRepository.isSignedIn()
                            if (!signedIn) statusMessage = "Conta criada. Confirme o e-mail e entre."
                            else onAuthChanged()
                        } catch (e: Exception) {
                            statusMessage = e.message ?: "Erro ao criar conta"
                        }
                    }
                }) {
                    Text("Criar conta")
                }
            }
            if (statusMessage.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(statusMessage, style = MaterialTheme.typography.bodySmall)
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(SyncRepository.currentEmail() ?: "", style = MaterialTheme.typography.bodyMedium)
            Row {
                TextButton(onClick = {
                    scope.launch {
                        statusMessage = "Sincronizando..."
                        try {
                            SyncRepository.pushLocalUsage(todayKey(), todayUsage)
                            remoteRows = SyncRepository.pullAllUsage()
                            statusMessage = "Sincronizado"
                        } catch (e: Exception) {
                            statusMessage = e.message ?: "Erro ao sincronizar"
                        }
                    }
                }) {
                    Text("Sincronizar agora")
                }
                TextButton(onClick = {
                    scope.launch {
                        SyncRepository.signOut()
                        signedIn = false
                        remoteRows = emptyList()
                        onAuthChanged()
                    }
                }) {
                    Text("Sair")
                }
            }
        }
        if (statusMessage.isNotEmpty()) {
            Text(statusMessage, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(modifier = Modifier.height(16.dp))

        val byDevice = remoteRows.groupBy { it.device }.mapValues { (_, rows) -> rows.sumOf { it.seconds } }

        if (byDevice.isEmpty()) {
            Text("Nenhum dado sincronizado ainda.", style = MaterialTheme.typography.bodyMedium)
        } else {
            val total = byDevice.values.sum()
            Text("Total combinado", style = MaterialTheme.typography.labelMedium)
            Text(formatDuration(total * 1000), style = MaterialTheme.typography.displaySmall)
            Spacer(modifier = Modifier.height(16.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(byDevice.entries.toList()) { (device, seconds) ->
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(if (device == "desktop") "Desktop" else "Android")
                            Text(formatDuration(seconds * 1000))
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = { if (total > 0) seconds.toFloat() / total else 0f },
                            modifier = Modifier.fillMaxWidth().height(8.dp),
                        )
                    }
                }
            }
        }
    }
}
