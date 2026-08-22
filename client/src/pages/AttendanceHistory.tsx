import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge, Badge } from '@/components/ui/Badge';
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Attendance History</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {statuses.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="bg-emerald-50 rounded-lg p-2 text-center"><p className="font-bold text-emerald-700">{summary.presentDays}</p><p className="text-[10px] text-gray-500">Present</p></div>
          <div className="bg-amber-50 rounded-lg p-2 text-center"><p className="font-bold text-amber-700">{summary.halfDays}</p><p className="text-[10px] text-gray-500">Half Day</p></div>
          <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="font-bold text-blue-700">{summary.leaveDays}</p><p className="text-[10px] text-gray-500">Leave</p></div>
          <div className="bg-orange-50 rounded-lg p-2 text-center"><p className="font-bold text-orange-700">{summary.lateDays}</p><p className="text-[10px] text-gray-500">Late</p></div>
          <div className="bg-red-50 rounded-lg p-2 text-center"><p className="font-bold text-red-700">{summary.absentDays}</p><p className="text-[10px] text-gray-500">Absent</p></div>
          <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="font-bold text-purple-700">{summary.totalOvertime}</p><p className="text-[10px] text-gray-500">OT</p></div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" />)}</div>
      ) : records.length === 0 ? (
        <Card><CardContent><p className="text-center text-gray-500 py-8">No attendance records found for this period.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(r.attendanceDate + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>In: {formatTime(r.checkInAt)}</span>
                    <span>Out: {formatTime(r.checkOutAt)}</span>
                    <span>Worked: {minutesToHuman(r.workedMinutes)}</span>
                  </div>
                  {r.isLate && (
                    <p className="text-xs text-amber-600 mt-1">Late: {r.lateMinutes}min{r.lateReason ? ` - ${r.lateReason}` : ''}</p>
                  )}
                  {r.hasOvertime && <p className="text-xs text-blue-600 mt-1">OT: {minutesToHuman(r.overtimeMinutes)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={r.mainStatus} />
                  {r.isLate && <Badge variant="orange">Late</Badge>}
                  {r.adminNote && <Badge variant="info">Adjusted</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Read-only notice */}
      <p className="text-xs text-center text-gray-400 mt-4">
        Attendance history is read-only. Contact your administrator for corrections.
      </p>
    </div>
  );
}
