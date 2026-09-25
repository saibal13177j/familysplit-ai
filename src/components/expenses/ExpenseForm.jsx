import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Avatar from '../ui/Avatar.jsx';
import { CATEGORIES, createExpense, updateExpense, computeSplitRows } from '../../services/expenses/index.js';
import { formatCurrency } from '../../utils/money.js';
import { suggestCategory } from '../../services/ai/categorizer.js';
import { isAiAvailable } from '../../services/ai/client.js';

const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal' },
  { value: 'amount', label: 'Custom amount' },
  { value: 'percentage', label: 'Percentage' },
];

export default function ExpenseForm({ groupId, members, currentUserId, createdBy, existingExpense, onSaved, onCancel }) {
  const isEdit = !!existingExpense;
  const [title, setTitle] = useState(existingExpense?.title ?? '');
  const [description, setDescription] = useState(existingExpense?.description ?? '');
  const [amount, setAmount] = useState(existingExpense?.amount ?? '');
  const [category, setCategory] = useState(existingExpense?.category ?? 'Other');
  const [paidBy, setPaidBy] = useState(existingExpense?.paid_by ?? currentUserId);
  const [expenseDate, setExpenseDate] = useState(existingExpense?.expense_date ?? new Date().toISOString().slice(0, 10));
  const [splitType, setSplitType] = useState(existingExpense?.split_type ?? 'equal');
  const [selectedIds, setSelectedIds] = useState(
    existingExpense?.splits?.map((s) => s.user_id) ?? members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState(() => {
    const map = {};
    existingExpense?.splits?.forEach((s) => {
      map[s.user_id] = s.share_amount;
    });
    return map;
  });
  const [customPercentages, setCustomPercentages] = useState(() => {
    const map = {};
    existingExpense?.splits?.forEach((s) => {
      map[s.user_id] = s.share_percentage;
    });
    return map;
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState(null);

  const selectedMembers = useMemo(() => members.filter((m) => selectedIds.includes(m.id)), [members, selectedIds]);

  // Optional AI category suggestion - purely advisory, never blocks saving,
  // and the app works identically if VITE_AI_FEATURES_ENABLED is off.
  useEffect(() => {
    if (!isAiAvailable() || isEdit || !title || title.length < 3) {
      setCategorySuggestion(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const suggestion = await suggestCategory(`${title} ${description}`);
      if (!cancelled && suggestion) setCategorySuggestion(suggestion);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [title, description, isEdit]);

  function toggleMember(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const splitPreview = useMemo(() => {
    if (!amount || Number(amount) <= 0 || selectedIds.length === 0) return null;
    try {
      const participants = selectedIds.map((id) => ({
        userId: id,
        amount: customAmounts[id],
        percentage: customPercentages[id],
      }));
      return computeSplitRows({ splitType, amount: Number(amount), participants });
    } catch (err) {
      return { error: err.message };
    }
  }, [amount, selectedIds, splitType, customAmounts, customPercentages]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError('Title is required.');
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount.');
    if (selectedIds.length === 0) return setError('Select at least one participant.');

    const participants = selectedIds.map((id) => ({
      userId: id,
      amount: customAmounts[id],
      percentage: customPercentages[id],
    }));

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateExpense(existingExpense.id, {
          title: title.trim(),
          description,
          amount: Number(amount),
          category,
          paid_by: paidBy,
          expense_date: expenseDate,
          splitType,
          participants,
        });
      } else {
        await createExpense({
          groupId,
          paidBy,
          title: title.trim(),
          description,
          amount: Number(amount),
          category,
          splitType,
          expenseDate,
          participants,
          createdBy,
        });
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorBanner message={error} />

      <Input label="Title" placeholder="Groceries" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Input label="Date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {categorySuggestion && categorySuggestion.category !== category && (
          <button
            type="button"
            onClick={() => setCategory(categorySuggestion.category)}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-600"
          >
            <Sparkles className="h-3 w-3" /> Suggested: {categorySuggestion.category}
          </button>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Paid by</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
              {m.id === currentUserId ? ' (you)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Split type</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {SPLIT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSplitType(t.value)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                splitType === t.value
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Split between</label>
        <div className="mt-1.5 space-y-2">
          {members.map((m) => {
            const checked = selectedIds.includes(m.id);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  checked ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="h-4 w-4 accent-brand-600" />
                <Avatar name={m.full_name} avatarUrl={m.avatar_url} size={28} />
                <span className="flex-1 text-sm text-gray-700">{m.full_name}</span>

                {checked && splitType === 'amount' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customAmounts[m.id] ?? ''}
                    onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                  />
                )}
                {checked && splitType === 'percentage' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={customPercentages[m.id] ?? ''}
                      onChange={(e) => setCustomPercentages((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                )}
                {checked && splitType === 'equal' && selectedMembers.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {amount ? formatCurrency(Number(amount) / selectedMembers.length) : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {splitPreview?.error && <ErrorBanner message={splitPreview.error} />}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
