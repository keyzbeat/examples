import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-muted/70 shadow-soft transition-colors outline-none focus:border-coral focus:ring-3 focus:ring-coral/15 disabled:bg-lightgray disabled:text-muted aria-[invalid=true]:border-red-300 aria-[invalid=true]:ring-red-100'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />
})

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-[84px] py-2 leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%20stroke%3D%27%23777%27%20stroke-width%3D%272%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-[12.5px] font-medium text-ink/80', className)} {...props}>
      {children}
    </label>
  )
}

export function FieldShell({ label, htmlFor, required, error, help, className, children }: { label?: string; htmlFor?: string; required?: boolean; error?: string; help?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-coral">*</span>}
        </Label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : help ? <p className="mt-1 text-xs text-muted">{help}</p> : null}
    </div>
  )
}
