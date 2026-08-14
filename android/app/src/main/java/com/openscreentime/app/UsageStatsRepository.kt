package com.openscreentime.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Process
import java.util.Calendar

data class AppUsageEntry(
    val packageName: String,
    val label: String,
    val totalTimeMs: Long,
)

class UsageStatsRepository(private val context: Context) {

    fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName,
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun getTodayUsage(): List<AppUsageEntry> {
        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val startOfDay = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        val now = System.currentTimeMillis()

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startOfDay,
            now,
        ) ?: emptyList()

        val pm = context.packageManager
        val totalsByPackage = mutableMapOf<String, Long>()
        for (stat in stats) {
            if (stat.totalTimeInForeground <= 0) continue
            totalsByPackage[stat.packageName] =
                (totalsByPackage[stat.packageName] ?: 0L) + stat.totalTimeInForeground
        }

        return totalsByPackage.entries
            .mapNotNull { (pkg, timeMs) ->
                val label = try {
                    val appInfo = pm.getApplicationInfo(pkg, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: PackageManager.NameNotFoundException) {
                    null
                }
                label?.let { AppUsageEntry(pkg, it, timeMs) }
            }
            .sortedByDescending { it.totalTimeMs }
    }
}
