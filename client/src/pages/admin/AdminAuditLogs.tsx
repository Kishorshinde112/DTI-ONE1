import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, [pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/audit-logs', { params: { page: pagination.page, limit: 25 } });
      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  const actionColor = (a: string) => {
    if (a.includes('CREATED')) return 'success';
    if (a.includes('DELETED') || a.includes('REJECTED')) return 'danger';
    if (a.includes('UPDATED') || a.includes('ADJUSTED') || a.includes('APPROVED')) return 'info';
    return 'default';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
      ) : logs.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">No audit logs found.</Card>
      ) : (
        <div className="space-y-2">
          {logs.map(l => (
            <Card key={l.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={actionColor(l.action)}>{l.action}</Badge>
                    <span className="text-xs text-gray-500">{l.targetEntity}{l.targetId ? ` #${l.targetId}` : ''}</span>
                  </div>
                  {l.actorEmail && <p className="text-xs text-gray-500 mt-1">By: {l.actorEmail}</p>}
                  {l.reason && <p className="text-xs text-gray-600 mt-1">{l.reason}</p>}
                  {l.oldValue && <p className="text-xs text-gray-400 mt-1">Old: {JSON.stringify(l.oldValue).substring(0, 100)}</p>}
                  {l.newValue && <p className="text-xs text-gray-400">New: {JSON.stringify(l.newValue).substring(0, 100)}</p>}
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{pagination.total} entries</p>
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
