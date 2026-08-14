package com.openscreentime.app

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.openscreentime.app.ui.theme.OpenScreenTimeTheme

class MainActivity : ComponentActivity() {

    private lateinit var repository: UsageStatsRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = UsageStatsRepository(applicationContext)

        setContent {
            OpenScreenTimeTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    OpenScreenTimeApp(repository = repository)
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // triggers recomposition via the app's own onResume-based refresh
    }
}

@Composable
fun OpenScreenTimeApp(repository: UsageStatsRepository) {
    var hasAccess by remember { mutableStateOf(repository.hasUsageAccess()) }
    var usage by remember { mutableStateOf(listOf<AppUsageEntry>()) }

    LaunchedEffect(hasAccess) {
        if (hasAccess) {
            usage = repository.getTodayUsage()
        }
    }

    if (!hasAccess) {
        PermissionRequestScreen(
            repository = repository,
            onGranted = { hasAccess = true },
        )
    } else {
        UsageDashboard(usage = usage, onRefresh = { usage = repository.getTodayUsage() })
    }
}

@Composable
fun PermissionRequestScreen(
    repository: UsageStatsRepository,
    onGranted: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Permissão necessária",
            style = MaterialTheme.typography.headlineSmall,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "O OpenScreenTime precisa de acesso a estatísticas de uso para mostrar quanto tempo você passa em cada app.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = {
            context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }) {
            Text("Abrir configurações")
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(onClick = {
            if (repository.hasUsageAccess()) onGranted()
        }) {
            Text("Já autorizei, verificar de novo")
        }
    }
}

@Composable
fun UsageDashboard(usage: List<AppUsageEntry>, onRefresh: () -> Unit) {
    val total = usage.sumOf { it.totalTimeMs }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text(text = "Hoje", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = formatDuration(total),
            style = MaterialTheme.typography.displaySmall,
        )
        Spacer(modifier = Modifier.height(20.dp))

        if (usage.isEmpty()) {
            Text("Nenhum uso registrado ainda hoje.")
        } else {
            val max = usage.first().totalTimeMs
            LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                items(usage) { entry ->
                    AppUsageRow(entry = entry, maxMs = max)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        OutlinedButton(onClick = onRefresh, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Atualizar")
        }
    }
}

@Composable
fun AppUsageRow(entry: AppUsageEntry, maxMs: Long) {
    val fraction = if (maxMs > 0) (entry.totalTimeMs.toFloat() / maxMs).coerceIn(0.02f, 1f) else 0f

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(entry.label, style = MaterialTheme.typography.bodyLarge)
            Text(formatDuration(entry.totalTimeMs), style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(modifier = Modifier.height(6.dp))
        LinearProgressIndicator(
            progress = { fraction },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
        )
    }
}

fun formatDuration(ms: Long): String {
    val totalSeconds = ms / 1000
    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    return when {
        h == 0L && m == 0L -> "<1m"
        h == 0L -> "${m}m"
        else -> "${h}h ${m}m"
    }
}
