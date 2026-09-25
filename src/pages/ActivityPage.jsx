import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity as ActivityIcon, Receipt, HandCoins } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useGroups } from '../hooks/useGroups.js';
import { listGroupExpenses } from '../services/expenses/index.js';
import { listGroupSettlements } from '../services/settlements/index.js';
import { formatCurrency } from '../utils/money.js';
import { CATEGORY_ICON } from '../components/expenses/categoryIcons.js';

import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';

export default function ActivityPage() {
  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (groupsLoading) return;
      if (groups.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const groupById = new Map(groups.map((g) => [g.id, g]));
        const [expenseLists, settlementLists] = await Promise.all([
          Promise.all(groups.map((g) => listGroupExpenses(g.id, { limit: 10 }))),
          Promise.all(groups.map((g) => listGroupSettlements(g.id))),
        ]);

        const expenseEvents = expenseLists.flat().map((e) => ({
          type: 'expense',
          id: `expense-${e.id}`,
          date: e.created_at,
          group: groupById.get(e.group_id),
          data: e,
        }));

        const settlementEvents = settlementLists.flat().map((s) => ({
          type: 'settlement',
          id: `settlement-${s.id}`,
          date: s.created_at,
          group: groupById.get(s.group_id),
          data: s,
        }));

        const all = [...expenseEvents, ...settlementEvents]
          .filter((item) => item.group)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 30);

        if (!cancelled) setItems(all);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load activity.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [groups, groupsLoading]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-800">Activity</h1>
      <p className="mt-1 text-sm text-gray-500">Recent expenses and settlements across all your groups.</p>

      <div className="mt-6">
        <ErrorBanner message={error} />
        {loading || groupsLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No activity yet" description="Add an expense in a group to see it here." />
        ) : (
          <Card className="divide-y divide-gray-100">
            {items.map((item) =>
              item.type === 'expense' ? (
                <Link
                  key={item.id}
                  to={`/expenses/${item.data.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <ActivityIcon icon />
                  {(() => {
                    const Icon = CATEGORY_ICON[item.data.category] || Receipt;
                    return (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon className="h-4 w-4" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{item.data.title}</p>
                    <p className="truncate text-xs text-gray-400">
                      {item.group?.name} · {item.data.paid_by_profile?.full_name || 'Someone'} paid
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-gray-800">{formatCurrency(item.data.amount)}</p>
                </Link>
              ) : (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-owed-light text-owed-dark">
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {item.data.payer?.full_name} paid {item.data.receiver?.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-400">{item.group?.name} · settlement</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-owed-dark">{formatCurrency(item.data.amount)}</p>
                </div>
              )
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
