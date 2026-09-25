import React, { useState } from 'react';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { parseExpenseText } from '../../services/ai/expenseParser.js';
import { isAiAvailable } from '../../services/ai/client.js';
import { createExpense, CATEGORIES } from '../../services/expenses/index.js';
import { formatCurrency } from '../../utils/money.js';

import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Avatar from '../ui/Avatar.jsx';

/**
 * "Quick add" flow: the person describes an expense in plain language, an
 * AI service parses it into a best-guess structure, and this component
 * shows an editable CONFIRMATION SCREEN before anything is saved. Nothing
 * here ever calls createExpense without the user pressing "Add expense" -
 * the AI never creates data on its own, and the split/amount math below is
 * the same deterministic equal-split logic used everywhere else in the app,
 * never AI-derived.
 */
export default function AiExpenseConfirm({ groupId, members, currentUserId, onClose, onSaved }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsed, setParsed] = useState(null);

  // Confirmation-screen editable state, populated once parsing succeeds.
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const aiOn = isAiAvailable();

  async function handleParse(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setParseError(null);
    setParsing(true);
    try {
      const result = await parseExpenseText(text, { groupMembers: members });
      if (!result) {
        setParseError('Could not understand that. Try rephrasing, or use the regular "Add expense" form instead.');
        return;
      }
      setParsed(result);
      setTitle(result.title || text.trim().slice(0, 80));
      setAmount(result.amount);
      setCategory(CATEGORIES.includes(result.category) ? result.category : 'Other');
      setPaidBy(result.paidBy || currentUserId);
      setSelectedIds(result.participantIds?.length ? result.participantIds : members.map((m) => m.id));
    } catch (err) {
      setParseError(err.message || 'AI parsing failed. You can still add this manually.');
    } finally {
      setParsing(false);
    }
  }

  function toggleMember(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleConfirm() {
    setSaveError(null);
    if (!title.trim()) return setSaveError('Title is required.');
    if (!amount || Number(amount) <= 0) return setSaveError('Enter a valid amount.');
    if (selectedIds.length === 0) return setSaveError('Select at least one participant.');

    setSaving(true);
    try {
      await createExpense({
        groupId,
        paidBy,
        title: title.trim(),
        description: `Added via quick add: "${text.trim()}"`,
        amount: Number(amount),
        category,
        splitType: 'equal',
        expenseDate: new Date().toISOString().slice(0, 10),
        participants: selectedIds.map((id) => ({ userId: id })),
        createdBy: currentUserId,
      });
      onSaved?.();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:m-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Sparkles className="h-4 w-4 text-brand-600" /> Quick add with AI
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!aiOn && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              AI features aren't configured for this deployment, so this describes what would happen. Use the regular
              "Add expense" button to add this manually.
            </span>
          </div>
        )}

        {!parsed && (
          <form onSubmit={handleParse} className="mt-3 flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700">Describe the expense</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "Yesterday I paid 850 for dinner with Rahul and Maya"'
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
            />
            <ErrorBanner message={parseError} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={parsing || !aiOn}>
                {parsing ? 'Parsing…' : 'Parse expense'}
              </Button>
            </div>
          </form>
        )}

        {parsed && (
          <div className="mt-3 flex flex-col gap-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Review before saving — nothing is added until you confirm
            </p>
            <ErrorBanner message={saveError} />

            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Paid by</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Split equally between</label>
              <div className="mt-1.5 space-y-2">
                {members.map((m) => {
                  const checked = selectedIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                        checked ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100'
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="h-4 w-4 accent-brand-600" />
                      <Avatar name={m.full_name} avatarUrl={m.avatar_url} size={26} />
                      <span className="flex-1 text-sm text-gray-700">{m.full_name}</span>
                      {checked && amount > 0 && (
                        <span className="text-xs text-gray-400">{formatCurrency(Number(amount) / selectedIds.length)}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" type="button" onClick={() => setParsed(null)}>
                Back
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Adding…' : 'Add expense'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
