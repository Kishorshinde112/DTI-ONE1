import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-accent p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {step === 'email' ? 'Forgot Password' : 'Reset Password'}
          </h2>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input id="email" type="email" label="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full" loading={loading}>Send OTP</Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input id="code" label="OTP Code" value={code} onChange={e => setCode(e.target.value)} maxLength={6} required />
              <Input id="newPassword" type="password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <p className="text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special</p>
              <Button type="submit" className="w-full" loading={loading}>Reset Password</Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:underline">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
