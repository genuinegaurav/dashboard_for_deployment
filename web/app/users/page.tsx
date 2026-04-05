'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppShell } from '@/components/app-shell';
import { RoleBadge } from '@/components/role-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ApiError, usersApi } from '@/lib/api';
import { User, UserRole, UserStatus } from '@/lib/types';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(12)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
  role: z.enum(['VIEWER', 'ANALYST', 'ADMIN']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { role: UserRole; status: UserStatus }>>({});
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      setMessage('User created successfully.');
      setErrorMessage(null);
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'VIEWER',
        status: 'ACTIVE',
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(error instanceof ApiError ? error.message : 'Unable to create the user.');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, role, status }: { id: string; role: UserRole; status: UserStatus }) =>
      usersApi.update(id, { role, status }),
    onSuccess: async () => {
      setMessage('User updated successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(error instanceof ApiError ? error.message : 'Unable to update the user.');
    },
  });

  const rows = usersQuery.data ?? [];

  function resolveDraft(user: User) {
    return drafts[user.id] ?? {
      role: user.role,
      status: user.status,
    };
  }

  async function onSubmit(values: CreateUserForm) {
    await createUserMutation.mutateAsync(values);
  }

  return (
    <AppShell
      title="User administration"
      description="Admin-only control surface for provisioning users, adjusting roles, and verifying status transitions."
      requiredRoles={['ADMIN']}
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950">Create user</h3>
            <p className="mt-1 text-sm text-slate-500">
              Use this form to validate admin-only user provisioning and duplicate-email handling.
            </p>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Name</Label>
              <Input id="create-user-name" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input id="create-user-email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-password">Password</Label>
              <Input id="create-user-password" type="password" {...form.register('password')} />
              <p className="text-xs leading-5 text-slate-500">
                Must include uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-user-role">Role</Label>
                <Select id="create-user-role" {...form.register('role')}>
                  <option value="VIEWER">Viewer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-status">Status</Label>
                <Select id="create-user-status" {...form.register('status')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                {message}
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creating user...' : 'Create user'}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Current users</h3>
            <p className="mt-1 text-sm text-slate-500">
              Adjust roles and statuses, then verify the RBAC impact through the rest of the app.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {rows.map((user) => {
              const draft = resolveDraft(user);

              return (
                <div
                  key={user.id}
                  className="rounded-3xl border border-border bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-950">{user.name}</p>
                        <RoleBadge role={user.role} />
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[150px_150px_auto]">
                      <Select
                        value={draft.role}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...resolveDraft(user),
                              role: event.target.value as UserRole,
                            },
                          }))
                        }
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="ANALYST">Analyst</option>
                        <option value="ADMIN">Admin</option>
                      </Select>
                      <Select
                        value={draft.status}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...resolveDraft(user),
                              status: event.target.value as UserStatus,
                            },
                          }))
                        }
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </Select>
                      <Button
                        onClick={() =>
                          updateUserMutation.mutate({
                            id: user.id,
                            role: draft.role,
                            status: draft.status,
                          })
                        }
                      >
                        Save changes
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!rows.length ? (
              <p className="text-sm text-slate-500">
                {usersQuery.isLoading ? 'Loading users...' : 'No users found.'}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
