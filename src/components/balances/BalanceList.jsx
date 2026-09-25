import React from 'react';
import { formatCurrency } from '../../utils/money.js';
import Avatar from '../ui/Avatar.jsx';
import Card from '../ui/Card.jsx';

export default function BalanceList({ balances, currentUserId }) {
  if (!balances?.length) return null;
  return (
    <Card className="divide-y divide-gray-100">
      {balances.map((b) => {
        const isPositive = b.net > 0.005;
        const isNegative = b.net < -0.005;
        const label = isPositive ? 'gets back' : isNegative ? 'owes' : 'settled up';
        const toneClass = isPositive ? 'text-owed-dark' : isNegative ? 'text-owe-dark' : 'text-gray-400';
        return (
          <div key={b.userId} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={b.profile?.full_name} avatarUrl={b.profile?.avatar_url} />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {b.profile?.full_name || 'Member'} {b.userId === currentUserId && <span className="text-gray-400">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
            <p className={`text-sm font-semibold ${toneClass}`}>
              {isNegative ? '-' : isPositive ? '+' : ''}
              {formatCurrency(Math.abs(b.net))}
            </p>
          </div>
        );
      })}
    </Card>
  );
}
