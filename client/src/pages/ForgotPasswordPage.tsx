import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthShell } from '@/components/auth/AuthShell';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If an account exists, an OTP has been sent.');
      setStep('reset');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === 'email' ? 'Forgot your password?' : 'Reset password'}
      subtitle={
        step === 'email'
          ? "No worries — we'll send you a one-time code."
          : 'Enter the code and your new password.'
      }
    >
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input id="email" type="email" label="Email Address" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full" size="lg" loading={loading}>Send OTP</Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <Input id="code" label="OTP Code" placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} className="text-center tracking-widest" required />
          <Input id="newPassword" type="password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <p className="text-xs text-slate-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special</p>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Reset Password</Button>
        </form>
      )}

      <div className="mt-6 pt-6 border-t border-border-soft text-center">
        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-ink hover:underline">Back to Login</Link>
      </div>
    </AuthShell>
  );
}
