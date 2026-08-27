import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { User, Mail, Phone, Building2, Hash, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const fields = [
    { icon: Hash, label: 'Employee ID', value: user.employeeId },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone },
    { icon: User, label: 'Username', value: user.username },
    { icon: Building2, label: 'Department', value: user.department || '-' },
    { icon: Calendar, label: 'Joining Date', value: user.joiningDate || '-' },
  ];

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" subtitle="Your personal information" />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a33] via-[#1e2c4f] to-primary-dark p-6 sm:p-8 text-white">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary-light/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar name={fullName} className="h-20 w-20 text-2xl ring-2 ring-white/20" />
          <div className="min-w-0">
            <h3 className="text-xl font-bold truncate">{fullName}</h3>
            <p className="text-sm text-slate-300 mt-0.5">{user.designation || (user.role === 'admin' ? 'Administrator' : 'Staff')}</p>
            <div className="mt-2">
              <Badge variant={user.employmentStatus === 'active' ? 'success' : 'danger'}>{user.employmentStatus}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-center text-slate-400">Contact your administrator to update profile information.</p>
    </div>
  );
}
