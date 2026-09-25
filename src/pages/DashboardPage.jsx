import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useGroups } from '../hooks/useGroups.js';
import { getDashboardSummary } from '../services/balances/index.js';
import { formatCurrency } from '../utils/money.js';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import GroupCard from '../components/groups/GroupCard.jsx';

function StatCard({ label, value, icon: Icon, tone }) {
  const toneClasses = {
    owe: 'text-owe-dark bg-owe-light',
    owed: 'text-owed-dark bg-owed-light',
    neutral: 'text-gray-700 bg-gray-100',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-800">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getDashboardSummary(user.id);
        if (!cancelled) setSummary(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, groups.length]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-800">
        Hi {profile?.full_name?.split(' ')[0] || 'there'} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">Here's where your family's money stands.</p>

      {loading ? (
        <Spinner className="mt-8" />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard label="You owe" value={formatCurrency(summary?.totalOwe ?? 0)} icon={ArrowUpRight} tone="owe" />
          <StatCard label="You are owed" value={formatCurrency(summary?.totalOwed ?? 0)} icon={ArrowDownRight} tone="owed" />
          <StatCard
            label="Net balance"
            value={`${(summary?.net ?? 0) >= 0 ? '+' : ''}${formatCurrency(summary?.net ?? 0)}`}
            icon={Scale}
            tone={summary?.net >= 0 ? 'owed' : 'owe'}
          />
          <StatCard label="Groups" value={summary?.groupCount ?? 0} icon={Users} tone="neutral" />
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Your groups</h2>
        <Link to="/groups" className="text-sm font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-3">
        {groupsLoading ? (
          <Spinner />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group to start splitting expenses with family."
            action={
              <Link to="/groups" className="text-sm font-medium text-brand-600 hover:underline">
                Create a group
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.slice(0, 6).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
