import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, Button, FieldLabel, Input } from '../components/ui';

export function RegisterPage(): JSX.Element {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start organizing your team's work">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">At least 8 characters.</p>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
