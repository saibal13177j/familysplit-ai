import React from 'react';
import { Crown } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Card from '../ui/Card.jsx';

export default function MembersList({ members }) {
  return (
    <Card className="divide-y divide-gray-100">
      {members.map((m) => (
        <div key={m.membershipId} className="flex items-center gap-3 px-4 py-3">
          <Avatar name={m.full_name} avatarUrl={m.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{m.full_name}</p>
            <p className="truncate text-xs text-gray-400">{m.email}</p>
          </div>
          {m.role === 'owner' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
              <Crown className="h-3 w-3" /> Owner
            </span>
          )}
        </div>
      ))}
    </Card>
  );
}
