import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { validateEmail } from '../utils/validation.js';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setError(null);
    setLoading(true);
    const { error: resetError } = await sendPasswordReset(email);
    setLoading(false);
    if (resetError) return setError(resetError.message);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent a password reset link.">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="h-10 w-10 text-brand-600" />
          <p className="text-sm text-gray-600">
            Follow the link we sent to <span className="font-medium">{email}</span> to set a new password.
          </p>
          <Link to="/login" className="mt-2 text-sm font-medium text-brand-600 hover:underline">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
