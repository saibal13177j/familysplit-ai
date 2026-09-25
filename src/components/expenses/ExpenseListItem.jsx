import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_ICON } from './categoryIcons.js';
import { formatCurrency } from '../../utils/money.js';
import Avatar from '../ui/Avatar.jsx';

export default function ExpenseListItem({ expense }) {
  const Icon = CATEGORY_ICON[expense.category] || CATEGORY_ICON.Other;
  return (
    <Link to={`/expenses/${expense.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{expense.title}</p>
        <p className="truncate text-xs text-gray-400">
          Paid by {expense.paid_by_profile?.full_name || 'someone'} · {expense.expense_date}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-gray-800">{formatCurrency(expense.amount)}</p>
    </Link>
  );
}
