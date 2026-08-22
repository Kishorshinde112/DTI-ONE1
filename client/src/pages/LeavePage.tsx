import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { LeaveType, LeaveRequest } from '@/types';

export default function LeavePage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: 0, fromDate: '', toDate: '', reason: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [typesRes, leavesRes] = await Promise.all([
        api.get('/leave/types'),
        api.get('/leave/my'),
      ]);
      setLeaveTypes(typesRes.data.data.leaveTypes);
      setLeaves(leavesRes.data.data.leaves);
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leave/request', form);
      toast.success('Leave request submitted');
      setShowForm(false);
      setForm({ leaveTypeId: 0, fromDate: '', toDate: '', reason: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Leave</h2>
        <Button onClick={() => setShowForm(true)}>Request Leave</Button>
      </div>

      {leaves.length === 0 ? (
        <Card><CardContent><p className="text-center text-gray-500 py-8">No leave requests yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {leaves.map(l => (
            <Card key={l.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.leaveTypeName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(l.fromDate + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                    {l.fromDate !== l.toDate && ` - ${new Date(l.toDate + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`}
                    {' '}({l.totalDays} day{l.totalDays > 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{l.reason}</p>
                  {l.reviewNote && <p className="text-xs text-blue-600 mt-0.5">Note: {l.reviewNote}</p>}
                </div>
                <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.leaveTypeId}
              onChange={e => setForm({ ...form, leaveTypeId: Number(e.target.value) })}
              required
            >
              <option value={0}>Select type</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
              <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
              <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
