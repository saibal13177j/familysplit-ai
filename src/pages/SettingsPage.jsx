import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { isAiAvailable } from '../services/ai/client.js';
import { validatePassword } from '../utils/validation.js';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';

export default function SettingsPage() {
  const { user, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setSuccess(false);
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError('Passwords do not match.');
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) throw updateError;
      setPassword('');
      setConfirm('');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account and app preferences.</p>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-gray-700">Change password</h2>
        <form onSubmit={handlePasswordChange} className="mt-4 flex flex-col gap-4">
          <ErrorBanner message={error} />
          {success && <p className="text-sm text-brand-600">Password updated.</p>}
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">AI features</h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAiAvailable()
                ? 'AI category suggestions, natural-language entry, and spending insights are enabled for this deployment.'
                : "AI features aren't configured for this deployment. Everything else — expenses, splits, and balances — works exactly the same without them."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-owed-light text-owed-dark">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Privacy</h2>
            <p className="mt-1 text-sm text-gray-500">
              Your groups and expenses are only visible to people you've added as members. Signed in as{' '}
              <span className="font-medium text-gray-700">{user?.email}</span>.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <Button variant="secondary" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>
    </div>
  );
}
