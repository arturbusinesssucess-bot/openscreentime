import { createClient } from '@supabase/supabase-js'

// Public URL + publishable key — safe to ship in the client, access is
// enforced by Postgres row level security (see openscreentime_usage_events).
const SUPABASE_URL = 'https://wqiiwmprbfuiyczstfls.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pf89obG35KdhVHvk-pdZiA_je5xrKiO'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

export interface RemoteUsageRow {
  device: 'desktop' | 'android'
  day: string
  app_name: string
  seconds: number
}

export async function pushLocalUsage(rows: { day: string; app_name: string; seconds: number }[]) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('not signed in')

  const payload = rows.map((r) => ({
    user_id: userId,
    device: 'desktop' as const,
    day: r.day,
    app_name: r.app_name,
    seconds: r.seconds,
    updated_at: new Date().toISOString(),
  }))

  if (payload.length === 0) return

  const { error } = await supabase
    .from('openscreentime_usage_events')
    .upsert(payload, { onConflict: 'user_id,device,day,app_name' })

  if (error) throw error
}

export async function pullAllUsage(): Promise<RemoteUsageRow[]> {
  const { data, error } = await supabase
    .from('openscreentime_usage_events')
    .select('device, day, app_name, seconds')
    .order('day', { ascending: false })

  if (error) throw error
  return data as RemoteUsageRow[]
}
