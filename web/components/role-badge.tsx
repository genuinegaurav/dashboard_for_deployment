import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

const styles: Record<UserRole, string> = {
  ADMIN: 'bg-teal-100 text-teal-900',
  ANALYST: 'bg-amber-100 text-amber-900',
  VIEWER: 'bg-slate-200 text-slate-700',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
        styles[role],
      )}
    >
      {role}
    </span>
  );
}
