'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

const demoAccounts = [
  {
    label: 'Admin',
    email: 'admin@finance.local',
    password: 'Password123!',
    description: 'Full CRUD on records and user management.',
  },
  {
    label: 'Analyst',
    email: 'analyst@finance.local',
    password: 'Password123!',
    description: 'Read-only access to records and dashboard insights.',
  },
  {
    label: 'Viewer',
    email: 'viewer@finance.local',
    password: 'Password123!',
    description: 'Read-only dashboard and records drill-down.',
  },
  {
    label: 'Inactive',
    email: 'inactive@finance.local',
    password: 'Password123!',
    description: 'Expected to fail, useful for negative-path testing.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { isLoading, login, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, router, user]);

  async function onSubmit(values: LoginForm) {
    setErrorMessage(null);

    try {
      await login(values.email, values.password);
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage('Unable to sign in right now.');
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden border-0 bg-slate-950 text-white">
          <div className="grid h-full gap-8 p-8 lg:p-12">
            <div className="space-y-4">
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-teal-200">
                Backend QA Dashboard
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
                Test every finance workflow through a real dashboard, not just Swagger.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                This frontend is wired directly to the NestJS backend using HttpOnly session
                cookies. It is intentionally built to validate role behavior, analytics, and CRUD
                paths end to end.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <Wallet className="h-6 w-6 text-amber-300" />
                <h2 className="mt-4 text-xl font-semibold">Records + Insights</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Filter transactions, inspect recent activity, and verify dashboard totals update
                  correctly.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="h-6 w-6 text-teal-300" />
                <h2 className="mt-4 text-xl font-semibold">Role-by-role QA</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Validate that admins can manage users while analysts and viewers stay read-only.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => {
                    form.setValue('email', account.email, { shouldValidate: true });
                    form.setValue('password', account.password, { shouldValidate: true });
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{account.label}</p>
                      <p className="mt-1 text-sm text-slate-300">{account.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      Fill form
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
                Sign in
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Start a role-based session
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use the seeded accounts to validate the dashboard and backend access control.
              </p>
            </div>

            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@finance.local" {...form.register('email')} />
                {form.formState.errors.email ? (
                  <p className="text-sm text-danger">{form.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password123!"
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-danger">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
