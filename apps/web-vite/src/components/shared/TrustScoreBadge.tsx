// ============================================================
// TRUST SCORE BADGE — Visual trust indicator
// ============================================================
'use client'

interface TrustScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e' // green
  if (score >= 60) return '#84cc16' // lime
  if (score >= 40) return '#eab308' // yellow
  if (score >= 20) return '#f97316' // orange
  return '#ef4444' // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Low'
  return 'New'
}

const sizeDimensions = {
  sm: { size: 40, stroke: 3, fontSize: 10 },
  md: { size: 56, stroke: 4, fontSize: 14 },
  lg: { size: 80, stroke: 5, fontSize: 20 },
}

export function TrustScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: TrustScoreBadgeProps) {
  const {
    size: dimension,
    stroke,
    fontSize,
  } = sizeDimensions[size]

  const radius = (dimension - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const offset = circumference - (progress / 100) * circumference
  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 ${className}`}
    >
      <div className="relative" style={{ width: dimension, height: dimension }}>
        {/* Background ring */}
        <svg
          className="transform -rotate-90"
          width={dimension}
          height={dimension}
        >
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted-foreground/20"
          />
          {/* Progress ring */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 ${stroke * 2}px ${color}40)`,
            }}
          />
        </svg>
        {/* Score text */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize }}
        >
          <span className="font-bold font-mono" style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
