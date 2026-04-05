'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, recordsApi } from '@/lib/api';
import { FinancialRecord, RecordType } from '@/lib/types';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';

const recordSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(2),
  recordDate: z.string().min(10),
  notes: z.string().max(240).optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

export default function RecordsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [type, setType] = useState<RecordType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isAdmin = user?.role === 'ADMIN';
  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      amount: 0,
      type: 'EXPENSE',
      category: '',
      recordDate: '',
      notes: '',
    },
  });

  const recordsQuery = useQuery({
    queryKey: ['records', { page, category, type, startDate, endDate }],
    queryFn: () =>
      recordsApi.list({
        page,
        pageSize: 10,
        category: category || undefined,
        type: type || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  useEffect(() => {
    const firstRecord = recordsQuery.data?.items[0] ?? null;

    if (!selectedRecord || !recordsQuery.data?.items.find((item) => item.id === selectedRecord.id)) {
      setSelectedRecord(firstRecord);
    }
  }, [recordsQuery.data, selectedRecord]);

  const createMutation = useMutation({
    mutationFn: (input: RecordForm) => recordsApi.create(input),
    onSuccess: async (record) => {
      setFormMessage('Record created successfully.');
      setFormError(null);
      form.reset({
        amount: 0,
        type: 'EXPENSE',
        category: '',
        recordDate: '',
        notes: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      setSelectedRecord(record);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Unable to create the record.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RecordForm> }) =>
      recordsApi.update(id, input),
    onSuccess: async (record) => {
      setFormMessage('Record updated successfully.');
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      setSelectedRecord(record);
      setEditingRecord(record);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Unable to update the record.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.remove(id),
    onSuccess: async () => {
      setFormMessage('Record deleted successfully.');
      setFormError(null);
      setEditingRecord(null);
      await queryClient.invalidateQueries({ queryKey: ['records'] });
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Unable to delete the record.');
    },
  });

  function beginCreate() {
    setEditingRecord(null);
    setFormMessage(null);
    setFormError(null);
    form.reset({
      amount: 0,
      type: 'EXPENSE',
      category: '',
      recordDate: '',
      notes: '',
    });
  }

  function beginEdit(record: FinancialRecord) {
    setEditingRecord(record);
    setFormMessage(null);
    setFormError(null);
    form.reset({
      amount: record.amount,
      type: record.type,
      category: record.category,
      recordDate: formatDateInput(record.recordDate),
      notes: record.notes || '',
    });
  }

  async function onSubmit(values: RecordForm) {
    if (editingRecord) {
      await updateMutation.mutateAsync({
        id: editingRecord.id,
        input: values,
      });
      return;
    }

    await createMutation.mutateAsync(values);
  }

  return (
    <AppShell
      title="Financial records"
      description="Validate filtering, pagination, record normalization, and admin-only mutation flows from a real UI."
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="record-category-filter">Category</Label>
              <Input
                id="record-category-filter"
                value={category}
                placeholder="salary"
                onChange={(event) => {
                  setPage(1);
                  setCategory(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-type-filter">Type</Label>
              <Select
                id="record-type-filter"
                value={type}
                onChange={(event) => {
                  setPage(1);
                  setType(event.target.value as RecordType | '');
                }}
              >
                <option value="">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-start-date">Start date</Label>
              <Input
                id="record-start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setPage(1);
                  setStartDate(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-end-date">End date</Label>
              <Input
                id="record-end-date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setPage(1);
                  setEndDate(event.target.value);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setPage(1);
                  setCategory('');
                  setType('');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Records list</h3>
                <p className="text-sm text-slate-500">
                  {recordsQuery.data ? `${recordsQuery.data.total} matching records` : 'Loading...'}
                </p>
              </div>
              {isAdmin ? (
                <Button onClick={beginCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New record
                </Button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Record date</th>
                    {isAdmin ? <th className="px-5 py-4">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {recordsQuery.data?.items.map((record) => (
                    <tr
                      key={record.id}
                      className="cursor-pointer border-b border-border/70 text-sm transition hover:bg-slate-50"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">{record.category}</td>
                      <td className="px-5 py-4 text-slate-600">{record.type}</td>
                      <td className="px-5 py-4 text-slate-900">{formatCurrency(record.amount)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(record.recordDate)}</td>
                      {isAdmin ? (
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              className="px-3 py-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                beginEdit(record);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="danger"
                              className="px-3 py-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                void deleteMutation.mutateAsync(record.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 text-sm text-slate-500">
              <span>Page {page}</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!recordsQuery.data || page * recordsQuery.data.pageSize >= recordsQuery.data.total}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="text-lg font-semibold text-slate-950">Record detail</h3>
              {selectedRecord ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <DetailRow label="Category" value={selectedRecord.category} />
                  <DetailRow label="Type" value={selectedRecord.type} />
                  <DetailRow label="Amount" value={formatCurrency(selectedRecord.amount)} />
                  <DetailRow label="Record date" value={formatDate(selectedRecord.recordDate)} />
                  <DetailRow label="Notes" value={selectedRecord.notes || 'No notes'} />
                  <DetailRow label="Created at" value={formatDate(selectedRecord.createdAt)} />
                </dl>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Select a row to inspect its payload.</p>
              )}
            </Card>

            {isAdmin ? (
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {editingRecord ? 'Edit record' : 'Create record'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Admin-only mutation panel for end-to-end backend testing.
                    </p>
                  </div>
                  {editingRecord ? (
                    <Button variant="ghost" onClick={beginCreate}>
                      Switch to create
                    </Button>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="record-amount">Amount</Label>
                      <Input id="record-amount" type="number" step="0.01" {...form.register('amount')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="record-type">Type</Label>
                      <Select id="record-type" {...form.register('type')}>
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="record-category">Category</Label>
                    <Input id="record-category" {...form.register('category')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="record-date">Record date</Label>
                    <Input id="record-date" type="date" {...form.register('recordDate')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="record-notes">Notes</Label>
                    <Textarea id="record-notes" {...form.register('notes')} />
                  </div>

                  {formError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  ) : null}

                  {formMessage ? (
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      {formMessage}
                    </div>
                  ) : null}

                  <Button
                    className="w-full"
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingRecord
                      ? updateMutation.isPending
                        ? 'Updating record...'
                        : 'Update record'
                      : createMutation.isPending
                        ? 'Creating record...'
                        : 'Create record'}
                  </Button>
                </form>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-slate-50 px-4 py-3">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
