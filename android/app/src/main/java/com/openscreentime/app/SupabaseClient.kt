package com.openscreentime.app

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest

// Public URL + publishable key — safe to ship in the client, access is
// enforced by Postgres row level security (see openscreentime_usage_events).
private const val SUPABASE_URL = "https://wqiiwmprbfuiyczstfls.supabase.co"
private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pf89obG35KdhVHvk-pdZiA_je5xrKiO"

val supabase = createSupabaseClient(
    supabaseUrl = SUPABASE_URL,
    supabaseKey = SUPABASE_PUBLISHABLE_KEY,
) {
    install(Auth)
    install(Postgrest)
}
