import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Leave Requests</h2>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : leaves.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">No leave requests found.</Card>
      ) : (
        <div className="space-y-2">
          {leaves.map(l => (
            <Card key={l.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">Employee #{l.employeeId}</p>
                  <p className="text-sm text-gray-500">{l.fromDate} — {l.toDate} ({l.totalDays} days)</p>
                  <p className="text-sm text-gray-600 mt-1">{l.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sv(l.status)}>{l.status}</Badge>
                  {l.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => review(l.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => { const note = prompt('Rejection reason:'); if (note) review(l.id, 'rejected', note); }}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{pagination.total} total</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pagination.page<=1} onClick={()=>setPagination(p=>({...p,page:p.page-1}))}><ChevronLeft className="h-4 w-4"/></Button>
            <span className="text-sm py-1.5 px-3">{pagination.page}/{pagination.totalPages}</span>
            <Button size="sm" variant="outline" disabled={pagination.page>=pagination.totalPages} onClick={()=>setPagination(p=>({...p,page:p.page+1}))}><ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
      )}
    </div>
  );
}
