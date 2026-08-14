import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppUsage, DayAppUsage, TodayUsage } from '../electron/preload'
import { supabase, pushLocalUsage, pullAllUsage, type RemoteUsageRow } from './supabase'

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '<1m'
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#f472b6', '#34d399', '#a78bfa', '#fb7185', '#60a5fa']

const CATEGORIES = ['Produtividade', 'Comunicação', 'Redes Sociais', 'Entretenimento', 'Desenvolvimento', 'Outros']
const DEFAULT_CATEGORY = 'Outros'
const CATEGORY_COLORS: Record<string, string> = {
  Produtividade: '#34d399',
  Comunicação: '#60a5fa',
  'Redes Sociais': '#f472b6',
  Entretenimento: '#f59e0b',
  Desenvolvimento: '#6366f1',
  Outros: '#8a8f9c',
}

function AppBar({
  usage,
  max,
  color,
  category,
  onCategoryChange,
}: {
  usage: AppUsage
  max: number
  color: string
  category?: string
  onCategoryChange?: (category: string) => void
}) {
  const pct = max > 0 ? Math.max((usage.seconds / max) * 100, 2) : 0
  return (
    <div className="app-row">
      <div className="app-row-header">
        <span className="app-name">{usage.app_name}</span>
        {onCategoryChange && (
          <select
            className="category-select"
            value={category ?? DEFAULT_CATEGORY}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <span className="app-time">{formatDuration(usage.seconds)}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function TodayView() {
  const [data, setData] = useState<TodayUsage | null>(null)
  const [categories, setCategories] = useState<Record<string, string>>({})

  const refresh = () => {
    window.openScreenTime.getToday().then(setData)
    window.openScreenTime.getCategories().then(setCategories)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const handleCategoryChange = (appName: string, category: string) => {
    setCategories((prev) => ({ ...prev, [appName]: category }))
    window.openScreenTime.setCategory(appName, category)
  }

  const categoryTotals = useMemo(() => {
    if (!data) return []
    const totals = new Map<string, number>()
    for (const a of data.apps) {
      const cat = categories[a.app_name] ?? DEFAULT_CATEGORY
      totals.set(cat, (totals.get(cat) ?? 0) + a.seconds)
    }
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [data, categories])

  if (!data) return <p className="muted">Carregando...</p>

  const max = data.apps[0]?.seconds ?? 0

  return (
    <div>
      <div className="total-card">
        <span className="total-label">Tempo de tela hoje</span>
        <span className="total-value">{formatDuration(data.total)}</span>
      </div>

      {categoryTotals.length > 0 && (
        <div className="history-bar-track category-summary-track">
          {categoryTotals.map(([cat, seconds]) => (
            <div
              key={cat}
              className="history-bar-segment"
              title={`${cat}: ${formatDuration(seconds)}`}
              style={{
                width: `${(seconds / data.total) * 100}%`,
                background: CATEGORY_COLORS[cat] ?? '#8a8f9c',
              }}
            />
          ))}
        </div>
      )}
      {categoryTotals.length > 0 && (
        <div className="category-legend">
          {categoryTotals.map(([cat, seconds]) => (
            <span key={cat} className="category-legend-item">
              <span className="dot" style={{ background: CATEGORY_COLORS[cat] ?? '#8a8f9c' }} />
              {cat} · {formatDuration(seconds)}
            </span>
          ))}
        </div>
      )}

      <div className="app-list">
        {data.apps.length === 0 && <p className="muted">Nenhum uso registrado ainda hoje.</p>}
        {data.apps.map((a, i) => (
          <AppBar
            key={a.app_name}
            usage={a}
            max={max}
            color={COLORS[i % COLORS.length]}
            category={categories[a.app_name]}
            onCategoryChange={(cat) => handleCategoryChange(a.app_name, cat)}
          />
        ))}
      </div>
    </div>
  )
}

function ExportButtons() {
  const [status, setStatus] = useState('')

  const handleExport = async (format: 'csv' | 'json') => {
    setStatus('Exportando...')
    const filePath = await window.openScreenTime.exportData(format)
    setStatus(filePath ? `Salvo em ${filePath}` : '')
  }

  return (
    <div className="export-row">
      <button className="link-btn export-btn" onClick={() => handleExport('csv')}>
        Exportar CSV
      </button>
      <button className="link-btn export-btn" onClick={() => handleExport('json')}>
        Exportar JSON
      </button>
      {status && <span className="muted export-status">{status}</span>}
    </div>
  )
}

function HistoryView() {
  const [rows, setRows] = useState<DayAppUsage[]>([])

  useEffect(() => {
    window.openScreenTime.getRange(7).then(setRows)
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<string, { total: number; apps: DayAppUsage[] }>()
    for (const row of rows) {
      const entry = map.get(row.day) ?? { total: 0, apps: [] }
      entry.total += row.seconds
      entry.apps.push(row)
      map.set(row.day, entry)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [rows])

  if (rows.length === 0) return <p className="muted">Sem dados dos últimos 7 dias ainda.</p>

  return (
    <div>
      <ExportButtons />
      <div className="history-list">
        {byDay.map(([day, entry]) => (
        <div key={day} className="history-day">
          <div className="history-day-header">
            <span>{new Date(day + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
            <span className="app-time">{formatDuration(entry.total)}</span>
          </div>
          <div className="history-bar-track">
            {entry.apps
              .slice()
              .sort((a, b) => b.seconds - a.seconds)
              .map((a, i) => (
                <div
                  key={a.app_name}
                  className="history-bar-segment"
                  title={`${a.app_name}: ${formatDuration(a.seconds)}`}
                  style={{
                    width: `${(a.seconds / entry.total) * 100}%`,
                    background: COLORS[i % COLORS.length],
                  }}
                />
              ))}
          </div>
        </div>
        ))}
      </div>
    </div>
  )
}

function LimitsView() {
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [todayApps, setTodayApps] = useState<AppUsage[]>([])
  const [selectedApp, setSelectedApp] = useState('')
  const [minutes, setMinutes] = useState('')

  const refresh = () => {
    window.openScreenTime.getLimits().then(setLimits)
    window.openScreenTime.getToday().then((d) => setTodayApps(d.apps))
  }

  useEffect(() => {
    refresh()
  }, [])

  const usageByApp = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of todayApps) map.set(a.app_name, a.seconds)
    return map
  }, [todayApps])

  const handleSave = async () => {
    const mins = Number(minutes)
    if (!selectedApp || !mins || mins <= 0) return
    await window.openScreenTime.setLimit(selectedApp, mins * 60)
    setSelectedApp('')
    setMinutes('')
    refresh()
  }

  const handleDelete = async (appName: string) => {
    await window.openScreenTime.deleteLimit(appName)
    refresh()
  }

  const limitEntries = Object.entries(limits)

  return (
    <div>
      <div className="limit-form">
        <select value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)}>
          <option value="">Selecione um app...</option>
          {todayApps
            .filter((a) => !(a.app_name in limits))
            .map((a) => (
              <option key={a.app_name} value={a.app_name}>
                {a.app_name}
              </option>
            ))}
        </select>
        <input
          type="number"
          min={1}
          placeholder="minutos por dia"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <button onClick={handleSave}>Adicionar limite</button>
      </div>

      {limitEntries.length === 0 ? (
        <p className="muted">Nenhum limite configurado ainda.</p>
      ) : (
        <div className="app-list">
          {limitEntries.map(([appName, limitSeconds]) => {
            const used = usageByApp.get(appName) ?? 0
            const pct = Math.min((used / limitSeconds) * 100, 100)
            const exceeded = used >= limitSeconds
            return (
              <div className="app-row" key={appName}>
                <div className="app-row-header">
                  <span className="app-name">{appName}</span>
                  <span className="app-time">
                    {formatDuration(used)} / {formatDuration(limitSeconds)}
                  </span>
                  <button className="link-btn" onClick={() => handleDelete(appName)}>
                    remover
                  </button>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(pct, 2)}%`, background: exceeded ? '#f43f5e' : '#6366f1' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DeviceSummary({ rows }: { rows: RemoteUsageRow[] }) {
  const byDevice = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.device, (map.get(r.device) ?? 0) + r.seconds)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [rows])

  const total = byDevice.reduce((sum, [, s]) => sum + s, 0)

  if (rows.length === 0) return <p className="muted">Nenhum dado sincronizado ainda.</p>

  return (
    <div>
      <div className="total-card">
        <span className="total-label">Total combinado (todos os dispositivos, 7 dias)</span>
        <span className="total-value">{formatDuration(total)}</span>
      </div>
      <div className="app-list">
        {byDevice.map(([device, seconds], i) => (
          <div className="app-row" key={device}>
            <div className="app-row-header">
              <span className="app-name">{device === 'desktop' ? 'Desktop' : 'Android'}</span>
              <span className="app-time">{formatDuration(seconds)}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${total > 0 ? (seconds / total) * 100 : 0}%`, background: COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountView() {
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [syncStatus, setSyncStatus] = useState('')
  const [remoteRows, setRemoteRows] = useState<RemoteUsageRow[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSignIn = async () => {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  const handleSignUp = async () => {
    setAuthError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setAuthError(error.message)
    else setAuthError('Conta criada. Verifique seu e-mail se a confirmação estiver ativada, ou já entre normalmente.')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setRemoteRows([])
  }

  const handleSync = async () => {
    setSyncStatus('Sincronizando...')
    try {
      const localRows = await window.openScreenTime.getAllUsage()
      await pushLocalUsage(localRows)
      const remote = await pullAllUsage()
      setRemoteRows(remote)
      setSyncStatus(`Sincronizado às ${new Date().toLocaleTimeString('pt-BR')}`)
    } catch (err) {
      setSyncStatus(`Erro: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (loadingSession) return <p className="muted">Carregando...</p>

  if (!session) {
    return (
      <div className="auth-form">
        <p className="muted">
          Entre com uma conta pra sincronizar o uso do desktop com o app Android e ver o tempo combinado.
        </p>
        <input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-buttons">
          <button onClick={handleSignIn}>Entrar</button>
          <button className="secondary" onClick={handleSignUp}>
            Criar conta
          </button>
        </div>
        {authError && <p className="muted export-status">{authError}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="export-row">
        <span className="app-name">{session.user.email}</span>
        <button className="link-btn export-btn" onClick={handleSync}>
          Sincronizar agora
        </button>
        <button className="link-btn export-btn" onClick={handleSignOut}>
          Sair
        </button>
        {syncStatus && <span className="muted export-status">{syncStatus}</span>}
      </div>
      <DeviceSummary rows={remoteRows} />
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'today' | 'history' | 'limits' | 'account'>('today')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>OpenScreenTime</h1>
        <nav className="tabs">
          <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
            Hoje
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            Últimos 7 dias
          </button>
          <button className={tab === 'limits' ? 'active' : ''} onClick={() => setTab('limits')}>
            Limites
          </button>
          <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>
            Conta
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'today' && <TodayView />}
        {tab === 'history' && <HistoryView />}
        {tab === 'limits' && <LimitsView />}
        {tab === 'account' && <AccountView />}
      </main>
    </div>
  )
}
