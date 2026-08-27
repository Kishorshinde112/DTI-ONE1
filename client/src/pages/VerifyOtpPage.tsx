import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthShell } from '@/components/auth/AuthShell';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function VerifyOtpPage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const purpose = params.get('purpose') || 'registration';
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code, purpose });
      toast.success('Verified successfully!');
      if (purpose === 'registration') {
        await refreshUser();
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email, purpose });
      toast.success('OTP resent!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email}`}>
      <form onSubmit={handleVerify} className="space-y-4">
        <Input
          id="code"
          label="Verification Code"
          placeholder="000000"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          className="text-center text-2xl tracking-widest"
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>Verify</Button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2">
        <div>
          <button onClick={handleResend} disabled={resending} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>
        <div>
          <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 hover:underline">Back to Login</Link>
        </div>
      </div>
    </AuthShell>
  );
}
