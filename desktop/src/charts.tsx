// Lightweight inline-SVG charts — no charting library dependency,
// full control over the "precision dark" aesthetic.

export interface TrendPoint {
  key: string
  label: string
  value: number
  highlight?: boolean
}

export function TrendBarChart({
  data,
  formatValue,
  height = 176,
}: {
  data: TrendPoint[]
  formatValue: (v: number) => string
  height?: number
}) {
  const width = 100 * data.length
  const max = Math.max(...data.map((d) => d.value), 1)
  const topPad = 22
  const bottomPad = 20
  const chartH = height - topPad - bottomPad
  const barW = 64
  const gap = 100 - barW

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * chartH : 0
        const x = i * 100 + gap / 2
        const y = topPad + (chartH - h)
        return (
          <g key={d.key} className={`trend-bar-group${d.highlight ? ' today' : ''}`}>
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            {d.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 7}
                textAnchor="middle"
                className="trend-value-label"
              >
                {formatValue(d.value)}
              </text>
            )}
            <rect
              className="trend-bar-fill"
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 3)}
              rx={5}
              fill={d.highlight ? 'var(--accent)' : 'var(--surface-2)'}
              stroke={d.highlight ? 'none' : 'var(--border)'}
            />
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              className="trend-axis-label"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export interface AreaPoint {
  key: string
  label: string
  value: number
}

export function AreaTrendChart({
  data,
  formatValue,
  height = 220,
  showEveryLabel = 5,
}: {
  data: AreaPoint[]
  formatValue: (v: number) => string
  height?: number
  showEveryLabel?: number
}) {
  const width = 720
  const leftPad = 8
  const rightPad = 8
  const topPad = 20
  const bottomPad = 26
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const max = Math.max(...data.map((d) => d.value), 1)

  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = leftPad + stepX * i
    const y = topPad + (chartH - (d.value / max) * chartH)
    return { x, y, d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? 0},${topPad + chartH} L${points[0]?.x ?? 0},${
    topPad + chartH
  } Z`

  const gridLines = [0.25, 0.5, 0.75].map((f) => topPad + chartH * f)

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {gridLines.map((y, i) => (
        <line key={i} x1={leftPad} x2={width - rightPad} y1={y} y2={y} className="area-chart-grid" />
      ))}

      <path d={areaPath} className="area-chart-fill" />
      <path d={linePath} className="area-chart-line" />

      {points.map((p, i) => (
        <g key={p.d.key}>
          {p.d.value > 0 && <circle cx={p.x} cy={p.y} r={2.5} className="area-chart-dot" />}
          <title>{`${p.d.label}: ${formatValue(p.d.value)}`}</title>
          {i % showEveryLabel === 0 && (
            <text x={p.x} y={height - 6} textAnchor="middle" className="trend-axis-label">
              {p.d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
}

export function DonutChart({
  segments,
  size = 128,
  centerLabel,
}: {
  segments: DonutSegment[]
  size?: number
  centerLabel?: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const radius = size / 2 - 12
  const circumference = 2 * Math.PI * radius
  const gapDeg = segments.length > 1 ? 2.2 : 0
  let cursor = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
        {total > 0 &&
          segments.map((seg) => {
            const pct = seg.value / total
            const degrees = pct * 360 - gapDeg
            const dash = (Math.max(degrees, 0) / 360) * circumference
            const rotation = cursor - 90
            cursor += pct * 360
            return (
              <circle
                key={seg.key}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={14}
                strokeDasharray={`${Math.max(dash, 0)} ${circumference}`}
                strokeLinecap="round"
                transform={`rotate(${rotation})`}
              >
                <title>{seg.label}</title>
              </circle>
            )
          })}
      </g>
      {centerLabel && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono)"
          fontSize="13"
          fill="var(--text)"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  )
}
