import React from 'react'
import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-slate-200/90 shadow-xs p-5 transition-shadow hover:shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  tooltip?: string
  className?: string
}

export function CardHeader({
  title,
  subtitle,
  action,
  tooltip,
  className,
}: CardHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between pb-3 border-b border-slate-100 mb-4', className)}>
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {tooltip && (
            <span
              className="text-xs text-slate-400 cursor-help"
              title={tooltip}
            >
              ⓘ
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
