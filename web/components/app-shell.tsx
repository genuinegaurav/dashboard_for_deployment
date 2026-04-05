'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect } from 'react';

import { useAuth } from '@/components/auth-provider';
import { RoleBadge } from '@/components/role-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AppShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const navigation = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/records',
    label: 'Records',
    icon: Wallet,
  },
  {
    href: '/users',
    label: 'Users',
    icon: ShieldCheck,
    roles: ['ADMIN'] as UserRole[],
  },
];

export function AppShell({
  title,
  description,
  children,
  requiredRoles,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, logout, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="px-8 py-6 text-sm text-slate-600">
          Restoring your session...
        </Card>
      </div>
    );
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <Card className="w-full p-8">
          <div className="space-y-4">
            <RoleBadge role={user.role} />
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              This area is restricted
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              The current signed-in role can read records and dashboards, but only admins can
              manage users.
            </p>
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <Card className="sticky top-6 overflow-hidden">
            <div className="border-b border-border bg-slate-950 px-6 py-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-200">Finance QA</p>
              <h1 className="mt-3 text-2xl font-semibold">Control Center</h1>
              <p className="mt-3 text-sm text-slate-300">
                Visual test harness for RBAC, records, and analytics.
              </p>
            </div>
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signed in as</p>
                <div>
                  <p className="text-base font-semibold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <RoleBadge role={user.role} />
              </div>

              <nav className="space-y-1.5">
                {navigation
                  .filter((item) => !item.roles || item.roles.includes(user.role))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                          isActive
                            ? 'bg-teal-50 text-teal-900'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </nav>

              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={async () => {
                  await logout();
                  router.replace('/login');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-white/90 px-6 py-6 backdrop-blur">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <div className="p-6">{children}</div>
          </Card>
        </main>
      </div>
    </div>
  );
}
