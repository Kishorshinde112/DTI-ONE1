import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { User, Mail, Phone, Building2, Hash, Calendar, MapPin, Clock } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Profile</h2>

      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{user.firstName[0]}{user.lastName[0]}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-gray-500">{user.designation || user.role === 'admin' ? 'Administrator' : 'Staff'}</p>
              <Badge variant={user.employmentStatus === 'active' ? 'success' : 'danger'}>{user.employmentStatus}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-gray-400">Contact your administrator to update profile information.</p>
    </div>
  );
}
