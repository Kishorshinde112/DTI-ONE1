import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Clock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', form);
      toast.success('Account created! Check your email for OTP.');
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}&purpose=registration`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-accent p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 mb-3">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input id="firstName" label="First Name" value={form.firstName} onChange={e => update('firstName', e.target.value)} required />
              <Input id="lastName" label="Last Name" value={form.lastName} onChange={e => update('lastName', e.target.value)} required />
            </div>
            <Input id="username" label="Username" value={form.username} onChange={e => update('username', e.target.value)} required />
            <Input id="email" type="email" label="Email" value={form.email} onChange={e => update('email', e.target.value)} required />
            <Input id="phone" label="Phone Number" value={form.phone} onChange={e => update('phone', e.target.value)} required />
            <Input id="password" type="password" label="Password" value={form.password} onChange={e => update('password', e.target.value)} required />
            <Input id="confirmPassword" type="password" label="Confirm Password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} error={errors.confirmPassword} required />

            <p className="text-xs text-gray-500">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special character</p>

            <Button type="submit" className="w-full" size="lg" loading={loading}>Create Account</Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
