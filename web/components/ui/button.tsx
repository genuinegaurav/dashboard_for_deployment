import { ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-brand text-white shadow-panel hover:bg-teal-700 focus:ring-teal-600',
        variant === 'secondary' &&
          'border border-border bg-white text-foreground hover:bg-slate-50 focus:ring-slate-300',
        variant === 'ghost' &&
          'bg-transparent text-muted hover:bg-slate-100 focus:ring-slate-200',
        variant === 'danger' &&
          'bg-danger text-white hover:bg-red-700 focus:ring-red-500',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
