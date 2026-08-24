import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaves(); }, [pagination.page, statusFilter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leave/admin', { params: { page: pagination.page, limit: 25, status: statusFilter || undefined } });
      setLeaves(data.data.leaves);
      setPagination(data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  const review = async (id: number, status: string, note?: string) => {
    try {
      await api.patch(`/leave/admin/${id}`, { status, reviewNote: note });
      toast.success(`Leave ${status}`);
      fetchLeaves();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const sv = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Leave Requests" subtitle={`${pagination.total} requests`} />

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key); setPagination(p => ({ ...p, page: 1 })); }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
              statusFilter === t.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-ink border-b-2 border-transparent'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pagination.total > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">{pagination.total}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : leaves.length === 0 ? (
        <Card className="p-10">
          <div className="text-center">
            <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No leave requests found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {leaves.map(l => (
            <Card key={l.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">Employee #{l.employeeId}</p>
                    <Badge variant={sv(l.status)} dot>{l.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{l.fromDate} — {l.toDate} ({l.totalDays} days)</p>
                  <p className="text-sm text-slate-600 mt-1">{l.reason}</p>
                  {l.reviewNote && <p className="text-xs text-blue-600 mt-1">Note: {l.reviewNote}</p>}
                </div>
                {l.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => review(l.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => { const note = prompt('Rejection reason:'); if (note) review(l.id, 'rejected', note); }}>Reject</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{pagination.total} total</p>
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
