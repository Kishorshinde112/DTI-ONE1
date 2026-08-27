import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Users, Clock, AlertTriangle, CalendarOff, Timer, UserX, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

function DonutChart({ segments, size = 180 }: {
  segments: { value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto" role="img" aria-label="Today's attendance breakdown">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e2e8f0" strokeWidth={stroke}
      />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x="50%" y="47%" textAnchor="middle" className="fill-slate-900 text-2xl font-bold" dy="0">
        {total}
      </text>
      <text x="50%" y="59%" textAnchor="middle" className="fill-slate-500 text-[11px]">
        employees
      </text>
    </svg>
  );
}

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

  const dateStr = stats?.date
    ? new Date(stats.date + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : '';

  const cards = [
    { icon: Users, label: 'Total Employees', value: stats?.totalEmployees || 0, color: 'text-primary', bg: 'bg-primary-soft' },
    { icon: Clock, label: 'Present Today', value: stats?.present || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: 'Late Today', value: stats?.late || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: CalendarOff, label: 'On Leave', value: stats?.onLeave || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Timer, label: 'Half Day', value: stats?.halfDay || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: TrendingUp, label: 'Overtime', value: stats?.overtime || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: UserX, label: 'Not Checked In', value: stats?.notCheckedIn || 0, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const donutSegments = [
    { value: stats?.present || 0, color: '#10b981', label: 'Present' },
    { value: stats?.halfDay || 0, color: '#f59e0b', label: 'Half Day' },
    { value: stats?.onLeave || 0, color: '#3b82f6', label: 'On Leave' },
    { value: stats?.notCheckedIn || 0, color: '#94a3b8', label: 'Not Checked In' },
  ];
  const donutColors = ['#10b981', '#f59e0b', '#3b82f6', '#94a3b8'];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={dateStr} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 tabular leading-tight">{value}</p>
                <p className="text-xs text-slate-500 truncate">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-1">Today's Breakdown</h3>
          <p className="text-sm text-slate-500 mb-5">Live attendance status overview</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <DonutChart segments={donutSegments} />
            <ul className="flex-1 w-full space-y-2.5">
              {donutSegments.map((seg, i) => (
                <li key={seg.label} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: donutColors[i] }} />
                  <span className="text-sm text-slate-600 flex-1">{seg.label}</span>
                  <span className="text-sm font-semibold text-slate-900 tabular">{seg.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-[#101a33] to-[#1e2c4f] text-white border-transparent">
          <h3 className="font-semibold mb-1">Attendance Rate</h3>
          <p className="text-sm text-slate-400 mb-5">Percentage of employees checked in</p>
          <div className="flex items-end justify-between gap-4">
            <p className="text-5xl font-bold tabular">
              {stats?.totalEmployees ? Math.round(((stats.present + stats.halfDay) / stats.totalEmployees) * 100) : 0}
              <span className="text-2xl text-slate-400">%</span>
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Present: {stats?.present || 0}</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> Half Day: {stats?.halfDay || 0}</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" /> Pending: {stats?.notCheckedIn || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
