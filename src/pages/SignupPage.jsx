import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { validateEmail, validatePassword } from '../utils/validation.js';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (!fullName.trim()) return setError('Please enter your name.');
    if (emailError) return setError(emailError);
    if (passwordError) return setError(passwordError);

    setLoading(true);
    const { data, error: signUpError } = await signUp({ email, password, fullName: fullName.trim() });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data?.session) {
      navigate('/dashboard', { replace: true });
    } else {
      // Email confirmation is required by the Supabase project settings.
      setConfirmationSent(true);
    }
  }

  if (confirmationSent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="We sent a confirmation link to finish setting up your account.">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" />
          <p className="text-sm text-gray-600">
            Click the link we emailed to <span className="font-medium">{email}</span>, then come back and log in.
          </p>
          <Link to="/login" className="mt-2 text-sm font-medium text-brand-600 hover:underline">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your family's space" subtitle="Track shared expenses in minutes.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Input label="Full name" name="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
