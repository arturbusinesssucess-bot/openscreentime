import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppUsage, DayAppUsage, TodayUsage } from '../electron/preload'
import { supabase, pushLocalUsage, pullAllUsage, type RemoteUsageRow } from './supabase'
import { AreaTrendChart, DonutChart } from './charts'

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '<1m'
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatShort(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h${m > 0 ? m : ''}`
}

const APP_COLORS = ['#ff8a3d', '#4fb0a5', '#9d8cd6', '#e2678a', '#e0b04a', '#6fbf8b', '#7c9fd1', '#c98a53']

const CATEGORIES = ['Produtividade', 'Comunicação', 'Redes Sociais', 'Entretenimento', 'Desenvolvimento', 'Outros']
const DEFAULT_CATEGORY = 'Outros'
const CATEGORY_COLORS: Record<string, string> = {
  Produtividade: '#4fb0a5',
  Comunicação: '#7c9fd1',
  'Redes Sociais': '#e2678a',
  Entretenimento: '#ff8a3d',
  Desenvolvimento: '#9d8cd6',
  Outros: '#8a8375',
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function dayLabel(day: string): string {
  return new Date(day + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

// ---------- Icons ----------

function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="9" y="1.5" width="5.5" height="9" rx="1" />
      <rect x="1.5" y="9.5" width="5.5" height="5" rx="1" />
      <rect x="9" y="12.5" width="5.5" height="2" rx="1" />
    </svg>
  )
}

function IconReport() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 13.5V6M8 13.5V2.5M13 13.5V9" strokeLinecap="round" />
      <path d="M1.5 13.5h13" strokeLinecap="round" />
    </svg>
  )
}

function IconGauge() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 12.5a6 6 0 1 1 12 0" strokeLinecap="round" />
      <path d="M8 12.5 11 7" strokeLinecap="round" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="5.3" r="2.6" />
      <path d="M2.5 13.5c1-2.7 3.2-4 5.5-4s4.5 1.3 5.5 4" strokeLinecap="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.3" />
      <path d="M8 4.6V8l2.6 1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBolt() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.8 1 3 9.2h3.4L6.2 15 13 6.4H9.4L8.8 1Z" />
    </svg>
  )
}

function IconWindow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 5.5h13" strokeLinecap="round" />
    </svg>
  )
}

function IconLayers() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M8 1.8 14 5 8 8.2 2 5 8 1.8Z" />
      <path d="m2 8 6 3.2L14 8" strokeLinecap="round" />
      <path d="m2 11 6 3.2L14 11" strokeLinecap="round" />
    </svg>
  )
}

function IconArrow({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 9, height: 9 }}>
      <path d={up ? 'M5 8.5V1.5M2 4.3 5 1.3l3 3' : 'M5 1.5v7M2 5.7 5 8.7l3-3'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DeltaPill({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return <span className="delta-pill flat">— igual</span>
  const positiveIsGood = invert ? value < 0 : value > 0
  return (
    <span className={`delta-pill ${positiveIsGood ? 'good' : 'bad'}`}>
      <IconArrow up={value > 0} />
      {Math.abs(Math.round(value))}%
    </span>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  delta,
  invertDelta,
}: {
  label: string
  value: string
  sub?: string
  icon: ReactNode
  color: string
  delta?: number
  invertDelta?: boolean
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className="stat-badge" style={{ background: `${color}22`, color }}>
          {icon}
        </span>
      </div>
      <span className="stat-card-value">{value}</span>
      {sub && <span className="stat-card-sub">{sub}</span>}
      {delta !== undefined && <DeltaPill value={delta} invert={invertDelta} />}
    </div>
  )
}

// ---------- Shared bits ----------

function RankRow({
  index,
  name,
  seconds,
  max,
  color,
  category,
  onCategoryChange,
}: {
  index: number
  name: string
  seconds: number
  max: number
  color: string
  category?: string
  onCategoryChange?: (category: string) => void
}) {
  const pct = max > 0 ? Math.max((seconds / max) * 100, 3) : 0
  return (
    <div className="rank-row">
      <span className="rank-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="rank-main">
        <div className="rank-name-row">
          <span className="rank-name">{name}</span>
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
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="rank-time">{formatDuration(seconds)}</span>
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  )
}

// ---------- Dashboard ----------

function DashboardView() {
  const [today, setToday] = useState<TodayUsage | null>(null)
  const [range, setRange] = useState<DayAppUsage[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [limits, setLimits] = useState<Record<string, number>>({})

  const refresh = () => {
    window.openScreenTime.getToday().then(setToday)
    window.openScreenTime.getRange(7).then(setRange)
    window.openScreenTime.getCategories().then(setCategories)
    window.openScreenTime.getLimits().then(setLimits)
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

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const r of range) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.seconds)
    const days: { key: string; label: string; value: number; highlight?: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, label: dayLabel(key), value: byDay.get(key) ?? 0, highlight: i === 0 })
    }
    return days
  }, [range])

  const yesterdayTotal = useMemo(() => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const key = y.toISOString().slice(0, 10)
    return range.filter((r) => r.day === key).reduce((s, r) => s + r.seconds, 0)
  }, [range])

  const weekAverage = useMemo(() => {
    if (trendData.length === 0) return 0
    return Math.round(trendData.reduce((s, d) => s + d.value, 0) / trendData.length)
  }, [trendData])

  const categoryTotals = useMemo(() => {
    if (!today) return []
    const totals = new Map<string, number>()
    for (const a of today.apps) {
      const cat = categories[a.app_name] ?? DEFAULT_CATEGORY
      totals.set(cat, (totals.get(cat) ?? 0) + a.seconds)
    }
    return Array.from(totals.entries())
      .map(([label, value]) => ({ key: label, label, value, color: CATEGORY_COLORS[label] ?? '#8a8375' }))
      .sort((a, b) => b.value - a.value)
  }, [today, categories])

  const nearLimits = useMemo(() => {
    if (!today) return []
    return today.apps
      .filter((a) => limits[a.app_name])
      .map((a) => ({ app: a.app_name, seconds: a.seconds, limit: limits[a.app_name] }))
      .filter((l) => l.seconds / l.limit >= 0.7)
      .sort((a, b) => b.seconds / b.limit - a.seconds / a.limit)
  }, [today, limits])

  if (!today) return <EmptyState title="Carregando..." />

  const topApp = today.apps[0]
  const produtividadeSeconds = categoryTotals.find((c) => c.label === 'Produtividade')?.value ?? 0
  const deltaPct = yesterdayTotal > 0 ? ((today.total - yesterdayTotal) / yesterdayTotal) * 100 : 0
  const maxAppSeconds = today.apps[0]?.seconds ?? 0

  return (
    <div>
      <div className="stat-grid">
        <StatCard
          label="Tempo de tela hoje"
          value={formatShort(today.total)}
          sub={`média 7d ${formatShort(weekAverage)}`}
          icon={<IconClock />}
          color="#5b8dee"
          delta={yesterdayTotal > 0 ? deltaPct : undefined}
        />
        <StatCard
          label="Produtividade hoje"
          value={formatShort(produtividadeSeconds)}
          sub={today.total > 0 ? `${Math.round((produtividadeSeconds / today.total) * 100)}% do total` : undefined}
          icon={<IconBolt />}
          color="#34c98f"
        />
        <StatCard
          label="App mais usado"
          value={topApp ? topApp.app_name : '—'}
          sub={topApp ? formatDuration(topApp.seconds) : undefined}
          icon={<IconWindow />}
          color="#e0a23d"
        />
        <StatCard
          label="Apps ativos"
          value={String(today.apps.length)}
          sub="hoje"
          icon={<IconLayers />}
          color="#e2678a"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <div className="panel">
            <div className="panel-title-row">
              <p className="panel-title">Tendência · 7 dias</p>
              <span className="panel-meta">{formatDuration(trendData.reduce((s, d) => s + d.value, 0))} total</span>
            </div>
            <AreaTrendChart data={trendData} formatValue={formatShort} height={180} color="#5b8dee" gradientId="dashboardGradient" />
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <p className="panel-title">Aplicativos hoje</p>
            </div>
            {today.apps.length === 0 ? (
              <EmptyState title="Nenhum uso ainda" hint="Assim que você usar algum app, ele aparece aqui." />
            ) : (
              <div className="rank-list">
                {today.apps.slice(0, 8).map((a, i) => (
                  <RankRow
                    key={a.app_name}
                    index={i}
                    name={a.app_name}
                    seconds={a.seconds}
                    max={maxAppSeconds}
                    color={APP_COLORS[i % APP_COLORS.length]}
                    category={categories[a.app_name]}
                    onCategoryChange={(cat) => handleCategoryChange(a.app_name, cat)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-col">
          <div className="panel">
            <div className="panel-title-row">
              <p className="panel-title">Categorias hoje</p>
            </div>
            {categoryTotals.length === 0 ? (
              <EmptyState title="Sem dados" />
            ) : (
              <div className="donut-wrap">
                <DonutChart segments={categoryTotals} size={148} centerLabel={formatShort(today.total)} />
                <div className="donut-legend">
                  {categoryTotals.map((c) => (
                    <div className="legend-row" key={c.key}>
                      <span className="legend-dot" style={{ background: c.color }} />
                      <span className="legend-label">{c.label}</span>
                      <span className="legend-value">{formatDuration(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <p className="panel-title">Perto do limite</p>
            </div>
            {nearLimits.length === 0 ? (
              <EmptyState title="Tudo tranquilo" hint="Nenhum app perto do limite diário." />
            ) : (
              <div className="rank-list">
                {nearLimits.map((l, i) => (
                  <div key={l.app} className="rank-row">
                    <span className="rank-index">{String(i + 1).padStart(2, '0')}</span>
                    <div className="rank-main">
                      <div className="rank-name-row">
                        <span className="rank-name">{l.app}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.min((l.seconds / l.limit) * 100, 100)}%`,
                            background: l.seconds >= l.limit ? 'var(--danger)' : 'var(--warning)',
                          }}
                        />
                      </div>
                    </div>
                    <span className="rank-time">
                      {formatDuration(l.seconds)}/{formatDuration(l.limit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Report ----------

const PERIODS = [
  { key: 7, label: '7 dias' },
  { key: 14, label: '14 dias' },
  { key: 30, label: '30 dias' },
]

function ReportView() {
  const [periodDays, setPeriodDays] = useState(7)
  const [rows, setRows] = useState<DayAppUsage[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [exportStatus, setExportStatus] = useState('')
  const [appSearch, setAppSearch] = useState('')
  const [previousRows, setPreviousRows] = useState<DayAppUsage[]>([])

  useEffect(() => {
    window.openScreenTime.getRange(periodDays).then(setRows)
    window.openScreenTime.getCategories().then(setCategories)
    window.openScreenTime.getRange(periodDays * 2).then((all) => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - periodDays)
      const cutoffKey = cutoff.toISOString().slice(0, 10)
      setPreviousRows(all.filter((r) => r.day < cutoffKey))
    })
  }, [periodDays])

  const previousTotal = useMemo(() => previousRows.reduce((s, r) => s + r.seconds, 0), [previousRows])

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.seconds)
    const days: { key: string; label: string; value: number }[] = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label =
        periodDays <= 7
          ? dayLabel(key)
          : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      days.push({ key, label, value: byDay.get(key) ?? 0 })
    }
    return days
  }, [rows, periodDays])

  const total = trendData.reduce((s, d) => s + d.value, 0)
  const dailyAverage = trendData.length > 0 ? Math.round(total / trendData.length) : 0
  const peakDay = trendData.reduce((max, d) => (d.value > max.value ? d : max), trendData[0] ?? { value: 0, label: '' })

  const appTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.app_name, (map.get(r.app_name) ?? 0) + r.seconds)
    return Array.from(map.entries())
      .map(([app_name, seconds]) => ({ app_name, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [rows])

  const filteredAppTotals = useMemo(
    () => appTotals.filter((a) => a.app_name.toLowerCase().includes(appSearch.toLowerCase())),
    [appTotals, appSearch],
  )

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const cat = categories[r.app_name] ?? DEFAULT_CATEGORY
      map.set(cat, (map.get(cat) ?? 0) + r.seconds)
    }
    return Array.from(map.entries())
      .map(([label, seconds]) => ({ label, seconds, color: CATEGORY_COLORS[label] ?? '#8a8375' }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [rows, categories])

  const handleExport = async (format: 'csv' | 'json') => {
    setExportStatus('Exportando...')
    const filePath = await window.openScreenTime.exportData(format)
    setExportStatus(filePath ? `Salvo em ${filePath}` : '')
  }

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 24, justifyContent: 'space-between' }}>
        <div className="pill-group">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`pill ${periodDays === p.key ? 'active' : ''}`}
              onClick={() => setPeriodDays(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => handleExport('csv')}>
            Exportar CSV
          </button>
          <button className="btn btn-ghost" onClick={() => handleExport('json')}>
            Exportar JSON
          </button>
          {exportStatus && <span className="status-line">{exportStatus}</span>}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Sem dados nesse período" hint="Volte quando tiver mais uso registrado." />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label={`Total · ${PERIODS.find((p) => p.key === periodDays)?.label}`}
              value={formatShort(total)}
              icon={<IconClock />}
              color="#5b8dee"
              delta={previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : undefined}
            />
            <StatCard label="Média diária" value={formatShort(dailyAverage)} icon={<IconBolt />} color="#34c98f" />
            <StatCard
              label="Pico"
              value={formatShort(peakDay.value)}
              sub={peakDay.label}
              icon={<IconWindow />}
              color="#e0a23d"
            />
            <StatCard
              label="App mais usado"
              value={appTotals[0]?.app_name ?? '—'}
              sub={appTotals[0] ? formatDuration(appTotals[0].seconds) : undefined}
              icon={<IconLayers />}
              color="#e2678a"
            />
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-title-row">
              <p className="panel-title">Uso ao longo do tempo</p>
            </div>
            <AreaTrendChart
              data={trendData}
              formatValue={formatShort}
              color="#5b8dee"
              gradientId="reportGradient"
              showEveryLabel={periodDays <= 7 ? 1 : periodDays <= 14 ? 2 : 5}
            />
          </div>

          <div className="dashboard-grid">
            <div className="panel">
              <div className="table-toolbar">
                <p className="panel-title" style={{ margin: 0 }}>
                  Ranking de apps
                </p>
                <input
                  className="search-input"
                  placeholder="Buscar app..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th style={{ textAlign: 'right' }}>Tempo</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppTotals.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '20px 0' }}>
                        Nenhum app encontrado
                      </td>
                    </tr>
                  )}
                  {filteredAppTotals.slice(0, 10).map((a, i) => (
                    <tr key={a.app_name}>
                      <td className="name">
                        <span className="row-dot" style={{ background: APP_COLORS[i % APP_COLORS.length] }} />
                        {a.app_name}
                      </td>
                      <td className="num">{formatDuration(a.seconds)}</td>
                      <td className="num">{total > 0 ? Math.round((a.seconds / total) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-title-row">
                <p className="panel-title">Por categoria</p>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'right' }}>Tempo</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map((c) => (
                    <tr key={c.label}>
                      <td className="name">
                        <span className="row-dot" style={{ background: c.color }} />
                        {c.label}
                      </td>
                      <td className="num">{formatDuration(c.seconds)}</td>
                      <td className="num">{total > 0 ? Math.round((c.seconds / total) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- Limits ----------

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
  const todayTotal = todayApps.reduce((s, a) => s + a.seconds, 0)
  const nearLimitCount = limitEntries.filter(([app, limit]) => {
    const used = usageByApp.get(app) ?? 0
    return used / limit >= 0.7 && used < limit
  }).length

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Tempo de tela hoje" value={formatShort(todayTotal)} icon={<IconClock />} color="#5b8dee" />
        <StatCard label="Limites ativos" value={String(limitEntries.length)} icon={<IconGauge />} color="#34c98f" />
        <StatCard
          label="Próximo do limite"
          value={String(nearLimitCount)}
          icon={<IconWindow />}
          color={nearLimitCount > 0 ? '#e0a23d' : '#8a8375'}
        />
      </div>
      <div className="panel">
      <div className="limit-add-row">
        <div className="field">
          <label>App</label>
          <select className="input" value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)}>
            <option value="">Selecione...</option>
            {todayApps
              .filter((a) => !(a.app_name in limits))
              .map((a) => (
                <option key={a.app_name} value={a.app_name}>
                  {a.app_name}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>Minutos/dia</label>
          <input
            className="input"
            type="number"
            min={1}
            placeholder="ex: 60"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          Adicionar limite
        </button>
      </div>

      {limitEntries.length === 0 ? (
        <EmptyState title="Nenhum limite configurado" hint="Escolha um app acima para começar." />
      ) : (
        <div>
          {limitEntries.map(([appName, limitSeconds]) => {
            const used = usageByApp.get(appName) ?? 0
            const pct = Math.min((used / limitSeconds) * 100, 100)
            const exceeded = used >= limitSeconds
            return (
              <div className="limit-card" key={appName}>
                <div className="limit-top">
                  <span className="limit-name">{appName}</span>
                  <div className="limit-figures">
                    <span className={exceeded ? 'exceeded' : ''}>{formatDuration(used)}</span>
                    <span>/ {formatDuration(limitSeconds)}</span>
                    <button className="btn-text danger" onClick={() => handleDelete(appName)}>
                      remover
                    </button>
                  </div>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(pct, 2)}%`, background: exceeded ? 'var(--danger)' : 'var(--accent)' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

// ---------- Account ----------

function DeviceSummary({ rows }: { rows: RemoteUsageRow[] }) {
  const byDevice = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.device, (map.get(r.device) ?? 0) + r.seconds)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [rows])

  const total = byDevice.reduce((sum, [, s]) => sum + s, 0)

  if (rows.length === 0) return <EmptyState title="Nenhum dado sincronizado ainda" />

  return (
    <div>
      <div className="hero-card" style={{ border: 'none', paddingBottom: 8 }}>
        <div>
          <span className="hero-label">Total combinado</span>
          <div className="hero-value">
            {formatShort(total)}
            <span className="unit">todos os dispositivos</span>
          </div>
        </div>
      </div>
      <div className="rank-list">
        {byDevice.map(([device, seconds], i) => (
          <div className="rank-row" key={device}>
            <span className="rank-index">{String(i + 1).padStart(2, '0')}</span>
            <div className="rank-main">
              <div className="rank-name-row">
                <span className="rank-name">{device === 'desktop' ? 'Desktop' : 'Android'}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${total > 0 ? (seconds / total) * 100 : 0}%`,
                    background: APP_COLORS[i % APP_COLORS.length],
                  }}
                />
              </div>
            </div>
            <span className="rank-time">{formatDuration(seconds)}</span>
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

  if (loadingSession) return <EmptyState title="Carregando..." />

  if (!session) {
    return (
      <div className="panel">
        <div className="auth-card">
          <p className="muted">
            Entre com uma conta pra sincronizar o uso do desktop com o app Android e ver o tempo combinado.
          </p>
          <div className="field">
            <label>E-mail</label>
            <input type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleSignIn}>
              Entrar
            </button>
            <button className="btn btn-ghost" onClick={handleSignUp}>
              Criar conta
            </button>
          </div>
          {authError && <p className="status-line error">{authError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-title-row">
        <span className="device-badge">{session.user.email}</span>
        <div className="btn-row">
          {syncStatus && <span className="status-line">{syncStatus}</span>}
          <button className="btn btn-ghost" onClick={handleSync}>
            Sincronizar agora
          </button>
          <button className="btn-text" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </div>
      <DeviceSummary rows={remoteRows} />
    </div>
  )
}

// ---------- App shell ----------

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: IconGrid },
  { key: 'report', label: 'Relatório', icon: IconReport },
  { key: 'limits', label: 'Limites', icon: IconGauge },
  { key: 'account', label: 'Conta', icon: IconUser },
] as const

type TabKey = (typeof NAV)[number]['key']

const PAGE_META: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral do seu tempo de tela hoje' },
  report: { title: 'Relatório', subtitle: 'Tendências e comparativos por período' },
  limits: { title: 'Limites', subtitle: 'Defina um teto diário por aplicativo' },
  account: { title: 'Conta', subtitle: 'Sincronize com o app Android' },
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('dashboard')
  const meta = PAGE_META[tab]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="mark" />
          <span className="name">OpenScreenTime</span>
        </div>
        <nav className="nav">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">{todayKey()}</div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{meta.title}</h1>
            <p className="page-subtitle">{meta.subtitle}</p>
          </div>
        </div>
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'report' && <ReportView />}
        {tab === 'limits' && <LimitsView />}
        {tab === 'account' && <AccountView />}
      </main>
    </div>
  )
}
