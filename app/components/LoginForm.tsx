'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { LogIn, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';

interface LoginFormProps {
  showToast: (message: string) => void;
}

export default function LoginForm({ showToast }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'register') {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showToast(data.error || 'Registration failed');
          setLoading(false);
          return;
        }

        showToast('Account created! Signing in...');
      } catch {
        showToast('Registration failed');
        setLoading(false);
        return;
      }
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      showToast(mode === 'login' ? 'Invalid email or password' : 'Sign-in failed after registration');
    } else {
      showToast('Signed in!');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-surface rounded-xl p-8 border border-surface-light">
        <h2 className="text-xl font-semibold mb-2 text-center text-gray-100">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {mode === 'login'
            ? 'Sign in to save and load your projects'
            : 'Create an account to persist your work'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 bg-surface-dark border-2 border-surface-light rounded-lg text-gray-200 focus:outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full p-3 bg-surface-dark border-2 border-surface-light rounded-lg text-gray-200 focus:outline-none focus:border-accent"
              placeholder={mode === 'register' ? 'At least 8 characters' : ''}
            />
          </div>

          <Button disabled={loading} className="w-full justify-center">
            <span className="flex items-center justify-center gap-2">
              {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </span>
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-accent hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-accent hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
