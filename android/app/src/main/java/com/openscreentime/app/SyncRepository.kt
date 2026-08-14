package com.openscreentime.app

import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UsageEventUpsert(
    @SerialName("user_id") val userId: String,
    val device: String = "android",
    val day: String,
    @SerialName("app_name") val appName: String,
    val seconds: Long,
)

@Serializable
data class RemoteUsageRow(
    val device: String,
    val day: String,
    @SerialName("app_name") val appName: String,
    val seconds: Long,
)

object SyncRepository {

    fun isSignedIn(): Boolean = supabase.auth.currentUserOrNull() != null

    fun currentEmail(): String? = supabase.auth.currentUserOrNull()?.email

    suspend fun signIn(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signUp(email: String, password: String) {
        supabase.auth.signUpWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signOut() {
        supabase.auth.signOut()
    }

    suspend fun pushLocalUsage(day: String, entries: List<AppUsageEntry>) {
        val userId = supabase.auth.currentUserOrNull()?.id ?: error("not signed in")
        if (entries.isEmpty()) return

        val payload = entries.map {
            UsageEventUpsert(
                userId = userId,
                day = day,
                appName = it.label,
                seconds = it.totalTimeMs / 1000,
            )
        }

        supabase.from("openscreentime_usage_events").upsert(payload) {
            onConflict = "user_id,device,day,app_name"
        }
    }

    suspend fun pullAllUsage(): List<RemoteUsageRow> {
        return supabase.from("openscreentime_usage_events")
            .select(columns = Columns.list("device", "day", "app_name", "seconds"))
            .decodeList<RemoteUsageRow>()
    }
}
