import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import Card from '../ui/Card.jsx';

export default function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="p-4 transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800">{group.name}</p>
            {group.description && <p className="mt-0.5 truncate text-sm text-gray-400">{group.description}</p>}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5" />
          {group.myRole === 'owner' ? 'Owner' : 'Member'}
        </div>
      </Card>
    </Link>
  );
}
