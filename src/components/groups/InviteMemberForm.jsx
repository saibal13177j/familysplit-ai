import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import * as groupsApi from '../../services/groups.js';
import { validateEmail } from '../../utils/validation.js';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';

export default function InviteMemberForm({ groupId, invitedBy, onInvited }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setError(null);
    setLoading(true);
    try {
      await groupsApi.inviteMember({ groupId, email, invitedBy });
      setSuccess(true);
      setEmail('');
      onInvited?.();
    } catch (err) {
      setError(err.message?.includes('duplicate') ? 'That person already has a pending invite.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          label="Invite by email"
          type="email"
          placeholder="family.member@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSuccess(false);
          }}
        />
      </div>
      <Button type="submit" disabled={loading}>
        <UserPlus className="h-4 w-4" /> {loading ? 'Sending…' : 'Invite'}
      </Button>
      {error && <ErrorBanner message={error} />}
      {success && <p className="text-xs text-brand-600">Invitation sent!</p>}
    </form>
  );
}
