import { SelectHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100',
        className,
      )}
      {...props}
    />
  ),
);

Select.displayName = 'Select';
