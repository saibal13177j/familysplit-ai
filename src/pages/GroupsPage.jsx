import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useGroups } from '../hooks/useGroups.js';
import { validateGroupName } from '../utils/validation.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import GroupCard from '../components/groups/GroupCard.jsx';

export default function GroupsPage() {
  const { groups, loading, error, createGroup } = useGroups();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    const nameError = validateGroupName(name);
    if (nameError) return setFormError(nameError);
    setFormError(null);
    setSubmitting(true);
    try {
      await createGroup({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Your groups</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New group
        </Button>
      </div>

      {showForm && (
        <Card className="mt-4 p-5">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <ErrorBanner message={formError} />
            <Input
              label="Group name"
              placeholder="Family Expenses"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Description (optional)"
              placeholder="Shared household costs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create group'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6">
        <ErrorBanner message={error} />
        {loading ? (
          <Spinner />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create your first group to start tracking shared expenses."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
