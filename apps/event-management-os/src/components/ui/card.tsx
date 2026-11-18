import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-line bg-white shadow-soft', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, icon, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="flex size-7 items-center justify-center rounded-lg bg-beige text-ink/70 [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {description && <p className="truncate text-xs text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>
}
