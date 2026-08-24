import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthShell } from '@/components/auth/AuthShell';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.login, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in to your account" subtitle="Enter your credentials to continue">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="login"
          label="Email or Username"
          placeholder="Enter your email or username"
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          autoComplete="username"
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="current-password"
          required
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-border-soft text-center">
        <p className="text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:text-primary-dark hover:underline">Sign Up</Link>
        </p>
      </div>
    </AuthShell>
  );
}
