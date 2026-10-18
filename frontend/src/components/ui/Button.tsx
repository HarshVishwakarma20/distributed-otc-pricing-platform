import React from 'react'
import { clsx } from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  isLoading?: boolean
  disabledReason?: string
  icon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  disabledReason,
  icon,
  className,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const isButtonLoading = loading || isLoading
  const isDisabled = disabled || isButtonLoading || !!disabledReason

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white border-transparent focus:ring-blue-500 shadow-xs',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white border-transparent focus:ring-slate-700 shadow-xs',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 focus:ring-blue-500 shadow-xs',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent focus:ring-slate-400',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white border-transparent focus:ring-rose-500 shadow-xs',
  }

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabledReason) {
      e.preventDefault()
      return
    }
    if (onClick) onClick(e)
  }

  return (
    <button
      disabled={isDisabled}
      onClick={handleClick}
      title={disabledReason || props.title}
      className={clsx(
        'inline-flex items-center justify-center font-medium border rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-60 cursor-not-allowed hover:bg-none',
        className
      )}
      {...props}
    >
      {isButtonLoading ? (
        <svg
          className="animate-spin -ml-0.5 mr-2 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}
