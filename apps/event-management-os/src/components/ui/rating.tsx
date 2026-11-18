import { Star } from 'lucide-react'

export function RatingStars({ value }: { value?: number | null }) {
  if (!value) return <span className="text-muted">—</span>
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={i <= value ? 'size-3.5 fill-amber-400 text-amber-400' : 'size-3.5 text-line-strong'} />
      ))}
    </span>
  )
}
