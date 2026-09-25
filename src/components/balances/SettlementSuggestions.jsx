import React from 'react';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/money.js';
import Avatar from '../ui/Avatar.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

export default function SettlementSuggestions({ suggestions, onRecord }) {
  if (!suggestions?.length) {
    return (
      <Card className="p-5 text-center text-sm text-gray-400">Everyone is settled up. 🎉</Card>
    );
  }
  return (
    <Card className="divide-y divide-gray-100">
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Avatar name={s.fromProfile?.full_name} avatarUrl={s.fromProfile?.avatar_url} size={28} />
            <span className="truncate font-medium text-gray-700">{s.fromProfile?.full_name}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <Avatar name={s.toProfile?.full_name} avatarUrl={s.toProfile?.avatar_url} size={28} />
            <span className="truncate font-medium text-gray-700">{s.toProfile?.full_name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">{formatCurrency(s.amount)}</span>
            {onRecord && (
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onRecord(s)}>
                Mark paid
              </Button>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}
