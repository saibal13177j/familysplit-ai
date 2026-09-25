import React, { useState } from 'react';
import { recordSettlement } from '../../services/settlements/index.js';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Card from '../ui/Card.jsx';

export default function SettlementForm({ groupId, members, createdBy, initial, onSaved, onCancel }) {
  const [payerId, setPayerId] = useState(initial?.from ?? members[0]?.id ?? '');
  const [receiverId, setReceiverId] = useState(initial?.to ?? members[1]?.id ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await recordSettlement({
        groupId,
        payerId,
        receiverId,
        amount: Number(amount),
        note,
        settlementDate: date,
        createdBy,
      });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-gray-800">Record a settlement</h3>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <ErrorBanner message={error} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Who paid</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
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
            <label className="text-sm font-medium text-gray-700">Who received</label>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record settlement'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
