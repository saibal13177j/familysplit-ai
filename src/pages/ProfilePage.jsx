import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { updateProfile } from '../services/profile.js';
import { validateGroupName } from '../utils/validation.js';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import Avatar from '../components/ui/Avatar.jsx';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaved(false);
    // Reuse the group-name validator for "required, under 80 chars" - the
    // same shape of rule applies to a person's display name.
    const nameError = validateGroupName(fullName);
    if (nameError) return setError(nameError.replace('Group name', 'Name'));
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ userId: user.id, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() || null });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-gray-800">Profile</h1>
      <p className="mt-1 text-sm text-gray-500">This is how family members see you across your groups.</p>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={fullName || user?.email} avatarUrl={avatarUrl} size={56} />
          <div>
            <p className="font-medium text-gray-800">{fullName || 'Family member'}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <ErrorBanner message={error} />
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input
            label="Avatar URL (optional)"
            placeholder="https://…"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
          <Input label="Email" value={user?.email || ''} disabled className="cursor-not-allowed bg-gray-50 text-gray-400" />
          <p className="-mt-2 text-xs text-gray-400">
            Email is managed by your account and can't be changed here.
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-brand-600">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
