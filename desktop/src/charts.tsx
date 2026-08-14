// Lightweight inline-SVG charts — no charting library dependency,
// full control over the "precision dark" aesthetic.

export interface AreaPoint {
  key: string
  label: string
  value: number
}

// Catmull-Rom -> cubic Bezier, so the line reads as a smooth glowing
// curve instead of a jagged polyline.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`

  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

export function AreaTrendChart({
  data,
  formatValue,
  height = 220,
  showEveryLabel = 5,
  color = 'var(--accent)',
  gradientId = 'areaGradient',
  showLabels = true,
}: {
  data: AreaPoint[]
  formatValue: (v: number) => string
  height?: number
  showEveryLabel?: number
  color?: string
  gradientId?: string
  showLabels?: boolean
}) {
  const width = 720
  const leftPad = 8
  const rightPad = 8
  const topPad = 16
  const bottomPad = showLabels ? 26 : 6
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const max = Math.max(...data.map((d) => d.value), 1)

  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = leftPad + stepX * i
    const y = topPad + (chartH - (d.value / max) * chartH)
    return { x, y, d }
  })

  const linePath = smoothPath(points)
  const last = points[points.length - 1]
  const first = points[0]
  const areaPath = `${linePath} L${(last?.x ?? 0).toFixed(1)},${(topPad + chartH).toFixed(1)} L${(first?.x ?? 0).toFixed(1)},${(topPad + chartH).toFixed(1)} Z`

  const gridLines = [0, 0.33, 0.66, 1].map((f) => topPad + chartH * f)
  const dotStride = points.length <= 10 ? 1 : Math.ceil(points.length / 10)

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.38} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {gridLines.map((y, i) => (
        <line key={i} x1={leftPad} x2={width - rightPad} y1={y} y2={y} className="area-chart-grid" />
      ))}

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} className="area-chart-line" stroke={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />

      {points.map((p, i) => (
        <g key={p.d.key}>
          {p.d.value > 0 && i % dotStride === 0 && (
            <circle cx={p.x} cy={p.y} r={3.2} className="area-chart-dot" stroke={color} />
          )}
          <title>{`${p.d.label}: ${formatValue(p.d.value)}`}</title>
          {showLabels && i % showEveryLabel === 0 && (
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
