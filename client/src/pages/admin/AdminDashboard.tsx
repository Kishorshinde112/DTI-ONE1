import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Clock, AlertTriangle, CalendarOff, Timer, UserX } from 'lucide-react';
import api from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/attendance/dashboard');
      setStats(data.data);
    } catch { } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4,5,6,7].map(i => <div key={i} className="skeleton h-28" />)}</div>
      </div>
    );
  }

  const cards = [
    { icon: Users, label: 'Total Employees', value: stats?.totalEmployees || 0, color: 'text-primary', bg: 'bg-primary/5' },
    { icon: Clock, label: 'Present Today', value: stats?.present || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: 'Late Today', value: stats?.late || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: CalendarOff, label: 'On Leave', value: stats?.onLeave || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Timer, label: 'Half Day', value: stats?.halfDay || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Timer, label: 'Overtime', value: stats?.overtime || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: UserX, label: 'Not Checked In', value: stats?.notCheckedIn || 0, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">{stats?.date ? new Date(stats.date + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label}>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
