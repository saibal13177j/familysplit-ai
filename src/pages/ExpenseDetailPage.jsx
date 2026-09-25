import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getExpenseWithSplits, deleteExpense } from '../services/expenses/index.js';
import * as groupsApi from '../services/groups.js';
import { formatCurrency } from '../utils/money.js';
import { CATEGORY_ICON } from '../components/expenses/categoryIcons.js';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';

export default function ExpenseDetailPage() {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [expense, setExpense] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenseWithSplits(expenseId);
      setExpense(data);
      const memberList = await groupsApi.listGroupMembers(data.group_id);
      setMembers(memberList);
    } catch (err) {
      setError(err.message || 'Failed to load this expense.');
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteExpense(expenseId);
      navigate(`/groups/${expense.group_id}/expenses`, { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <Spinner className="mt-10" />;
  if (error && !expense) return <ErrorBanner message={error} />;
  if (!expense) return null;

  const Icon = CATEGORY_ICON[expense.category] || CATEGORY_ICON.Other;

  if (editing) {
    return (
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => setEditing(false)}
          className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel edit
        </button>
        <Card className="p-5">
          <h1 className="mb-4 text-lg font-semibold text-gray-800">Edit expense</h1>
          <ExpenseForm
            groupId={expense.group_id}
            members={members}
            currentUserId={user.id}
            createdBy={user.id}
            existingExpense={expense}
            onSaved={async () => {
              setEditing(false);
              await load();
            }}
            onCancel={() => setEditing(false)}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to={`/groups/${expense.group_id}/expenses`}
        className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to expenses
      </Link>

      <ErrorBanner message={error} />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{expense.title}</h1>
              <p className="text-xs text-gray-400">
                {expense.category} · {expense.expense_date}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-xl font-semibold text-gray-800">{formatCurrency(expense.amount)}</p>
        </div>

        {expense.description && <p className="mt-4 text-sm text-gray-600">{expense.description}</p>}

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
          <Avatar name={expense.paid_by_profile?.full_name} avatarUrl={expense.paid_by_profile?.avatar_url} size={28} />
          <p className="text-sm text-gray-600">
            Paid by <span className="font-medium text-gray-800">{expense.paid_by_profile?.full_name}</span>
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Split {expense.split_type === 'equal' ? 'equally' : expense.split_type === 'percentage' ? 'by percentage' : 'by custom amount'} between {expense.splits.length}{' '}
            {expense.splits.length === 1 ? 'person' : 'people'}
          </p>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {expense.splits.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Avatar name={s.profiles?.full_name} avatarUrl={s.profiles?.avatar_url} size={26} />
                  <span className="text-sm text-gray-700">{s.profiles?.full_name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(s.share_amount)}</p>
                  {s.share_percentage != null && (
                    <p className="text-xs text-gray-400">{Number(s.share_percentage).toFixed(2)}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this expense?"
        description="This will remove it and its splits for everyone in the group. Balances will recalculate automatically. This can't be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete expense'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
