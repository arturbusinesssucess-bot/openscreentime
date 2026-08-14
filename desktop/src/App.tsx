import { useEffect, useMemo, useState } from 'react'
import type { AppUsage, DayAppUsage, TodayUsage } from '../electron/preload'

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '<1m'
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#f472b6', '#34d399', '#a78bfa', '#fb7185', '#60a5fa']

function AppBar({ usage, max, color }: { usage: AppUsage; max: number; color: string }) {
  const pct = max > 0 ? Math.max((usage.seconds / max) * 100, 2) : 0
  return (
    <div className="app-row">
      <div className="app-row-header">
        <span className="app-name">{usage.app_name}</span>
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

  const refresh = () => {
    window.openScreenTime.getToday().then(setData)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  if (!data) return <p className="muted">Carregando...</p>

  const max = data.apps[0]?.seconds ?? 0

  return (
    <div>
      <div className="total-card">
        <span className="total-label">Tempo de tela hoje</span>
        <span className="total-value">{formatDuration(data.total)}</span>
      </div>
      <div className="app-list">
        {data.apps.length === 0 && <p className="muted">Nenhum uso registrado ainda hoje.</p>}
        {data.apps.map((a, i) => (
          <AppBar key={a.app_name} usage={a} max={max} color={COLORS[i % COLORS.length]} />
        ))}
      </div>
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
  )
}

export default function App() {
  const [tab, setTab] = useState<'today' | 'history'>('today')

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
        </nav>
      </header>
      <main className="app-main">{tab === 'today' ? <TodayView /> : <HistoryView />}</main>
    </div>
  )
}
