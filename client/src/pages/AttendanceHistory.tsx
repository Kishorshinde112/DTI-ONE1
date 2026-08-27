import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { CalendarX } from 'lucide-react';
import api from '@/lib/api';

function minutesToHuman(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function formatTime(isoStr?: string) {
  if (!isoStr) return '--';
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

export default function AttendanceHistory() {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchHistory(); }, [month, year, statusFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { month: String(month), year: String(year) };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/attendance/history', { params });
      setRecords(data.data.records);
      setSummary(data.data.summary);
    } catch { } finally { setLoading(false); }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const statuses = ['', 'FULL_DAY', 'HALF_DAY', 'LEAVE', 'PAID_LEAVE', 'ABSENT', 'WEEKLY_OFF'];

  const summaryItems = summary ? [
    { label: 'Present', value: summary.presentDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Half Day', value: summary.halfDays, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Leave', value: summary.leaveDays, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Late', value: summary.lateDays, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Absent', value: summary.absentDays, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'OT', value: summary.totalOvertime, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance History" subtitle="Browse and filter your attendance records. All records are read-only." />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select className="w-28" value={month} onChange={e => setMonth(Number(e.target.value))} aria-label="Month">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </Select>
        <Select className="w-28" value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Year">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select className="w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Status">
          <option value="">All Status</option>
          {statuses.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </Select>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {summaryItems.map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
              <p className={`font-bold ${color} tabular`}>{value}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" />)}</div>
      ) : records.length === 0 ? (
        <Card className="p-10">
          <div className="text-center">
            <CalendarX className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-zinc-500">No attendance records found for this period.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {new Date(r.attendanceDate + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                    </p>
                    <StatusBadge status={r.mainStatus} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><span className="font-medium text-zinc-600">In:</span> {formatTime(r.checkInAt)}</span>
                    <span className="flex items-center gap-1"><span className="font-medium text-zinc-600">Out:</span> {formatTime(r.checkOutAt)}</span>
                    <span className="flex items-center gap-1"><span className="font-medium text-zinc-600">Worked:</span> {minutesToHuman(r.workedMinutes)}</span>
                  </div>
                  {r.isLate && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">Late: {r.lateMinutes}min{r.lateReason ? ` - ${r.lateReason}` : ''}</p>
                  )}
                  {r.hasOvertime && <p className="text-xs text-blue-600 mt-1">OT: {minutesToHuman(r.overtimeMinutes)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.isLate && <Badge variant="orange">Late</Badge>}
                  {r.adminNote && <Badge variant="info">Adjusted</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Read-only notice */}
      <p className="text-xs text-center text-zinc-400 mt-4">
        Attendance history is read-only. Contact your administrator for corrections.
      </p>
    </div>
  );
}
