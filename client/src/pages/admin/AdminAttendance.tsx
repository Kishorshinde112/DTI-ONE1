import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Download, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function minutesToHuman(m: number) { if (!m) return '0m'; const h = Math.floor(m/60); const min = m%60; return h>0?`${h}h ${min}m`:`${min}m`; }
function formatTime(s?: string) { if (!s) return '--'; return new Date(s).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}); }

export default function AdminAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ from: '', to: '', status: '', employeeId: '', late: '', overtime: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAttendance(); }, [pagination.page, filters]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pagination.page), limit: String(pagination.limit) };
      for (const [k, v] of Object.entries(filters)) { if (v) params[k] = v; }
      const { data } = await api.get('/admin/attendance/list', { params });
      setRecords(data.data.attendance);
      setPagination(data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  const exportExcel = async () => {
    try {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(filters)) { if (v) params[k] = v; }
      const response = await api.get('/admin/attendance/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `DTI_Attendance_${new Date().toISOString().slice(0,7)}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
      toast.success('Excel exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle={`${pagination.total} records`}
        actions={<Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4" /> Export Excel</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <input type="date" className="rounded-lg border border-border-soft bg-white px-3.5 py-2 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} aria-label="From date" />
        <input type="date" className="rounded-lg border border-border-soft bg-white px-3.5 py-2 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} aria-label="To date" />
        <Select className="w-40" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} aria-label="Status">
          <option value="">All Status</option>
          <option value="FULL_DAY">Full Day</option><option value="HALF_DAY">Half Day</option>
          <option value="PRESENT">Present</option><option value="ABSENT">Absent</option>
          <option value="LEAVE">Leave</option><option value="PAID_LEAVE">Paid Leave</option>
        </Select>
        <Select className="w-36" value={filters.late} onChange={e => setFilters({...filters, late: e.target.value})} aria-label="Late filter">
          <option value="">Late: All</option><option value="true">Late Only</option>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-border-soft bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Employee</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">In</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Out</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Worked</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Late</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">OT</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3"><p className="font-medium text-ink">{r.employeeName}</p><p className="text-xs text-slate-500">{r.employeeCode}</p></td>
                <td className="px-4 py-3 text-slate-600">{r.attendanceDate}</td>
                <td className="px-4 py-3 text-slate-600 tabular">{formatTime(r.checkInAt)}</td>
                <td className="px-4 py-3 text-slate-600 tabular">{formatTime(r.checkOutAt)}</td>
                <td className="px-4 py-3 text-slate-600">{r.workedDuration}</td>
                <td className="px-4 py-3">{r.isLate ? <Badge variant="orange">{r.lateMinutes}m</Badge> : '-'}</td>
                <td className="px-4 py-3">{r.hasOvertime ? <Badge variant="info">{r.overtimeDuration}</Badge> : '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.mainStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-2">
        {records.map(r => (
          <Card key={r.id} className="p-3.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-ink text-sm">{r.employeeName}</p>
                <p className="text-xs text-slate-500">{r.employeeCode} · {r.attendanceDate}</p>
                <p className="text-xs text-slate-500 mt-1">In: {formatTime(r.checkInAt)} | Out: {formatTime(r.checkOutAt)} | {r.workedDuration}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={r.mainStatus} />
                {r.isLate && <Badge variant="orange">{r.lateMinutes}m late</Badge>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 w-full" />)}</div>}

      {!loading && records.length === 0 && (
        <Card className="p-10">
          <div className="text-center">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No attendance records match your filters.</p>
          </div>
        </Card>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{pagination.total} records</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pagination.page<=1} onClick={()=>setPagination(p=>({...p,page:p.page-1}))}><ChevronLeft className="h-4 w-4"/></Button>
            <span className="text-sm py-1.5 px-3 text-slate-600">{pagination.page}/{pagination.totalPages}</span>
            <Button size="sm" variant="outline" disabled={pagination.page>=pagination.totalPages} onClick={()=>setPagination(p=>({...p,page:p.page+1}))}><ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
      )}
    </div>
  );
}
