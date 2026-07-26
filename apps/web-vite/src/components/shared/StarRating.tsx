'use client'

interface StarRatingProps {
  rating: number
  totalReviews: number
  size?: 'sm' | 'md'
  showCount?: boolean
}

export function StarRating({
  rating,
  totalReviews,
  size = 'sm',
  showCount = true,
}: StarRatingProps) {
  if (totalReviews === 0 || rating === 0) {
    return (
      <span className={`text-slate-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        No reviews yet
      </span>
    )
  }

  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.25
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  const starSize = size === 'sm' ? 'text-sm' : 'text-lg'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`text-amber-400 ${starSize} tracking-tight`}>
        {'★'.repeat(fullStars)}
        {hasHalf ? '⯨' : ''}
        {'☆'.repeat(emptyStars)}
      </span>
      <span className={`text-slate-400 ${textSize} font-medium`}>
        {rating.toFixed(1)}
        {showCount && (
          <span className="text-slate-500 ml-0.5">({totalReviews})</span>
        )}
      </span>
    </span>
  )
}
