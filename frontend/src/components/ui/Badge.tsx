import React from 'react'
import { clsx } from 'clsx'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className,
  dot = false,
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  const dotStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium border rounded-md tracking-tight',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full mr-1.5', dotStyles[variant])}
        />
      )}
      {children}
    </span>
  )
}
