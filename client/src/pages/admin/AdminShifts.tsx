import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Edit, Timer } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminShifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', startTime: '10:00', endTime: '19:00', graceMinutes: 15,
    minFullDayMinutes: 480, halfDayMinutes: 240, overtimeThresholdMinutes: 0,
    earlyCheckinAllowed: true, weeklyOffDays: [0, 6] as number[],
  });

  useEffect(() => { fetchShifts(); }, []);

  const fetchShifts = async () => {
    try {
      const { data } = await api.get('/admin/shifts');
      setShifts(data.data.shifts);
    } catch { } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', startTime: '10:00', endTime: '19:00', graceMinutes: 15, minFullDayMinutes: 480, halfDayMinutes: 240, overtimeThresholdMinutes: 0, earlyCheckinAllowed: true, weeklyOffDays: [0, 6] });
    setShowForm(true);
  };

  const openEdit = (shift: any) => {
    setEditId(shift.id);
    setForm({
      name: shift.name, startTime: shift.startTime.substring(0, 5), endTime: shift.endTime.substring(0, 5),
      graceMinutes: shift.graceMinutes, minFullDayMinutes: shift.minFullDayMinutes,
      halfDayMinutes: shift.halfDayMinutes, overtimeThresholdMinutes: shift.overtimeThresholdMinutes,
      earlyCheckinAllowed: shift.earlyCheckinAllowed, weeklyOffDays: shift.weeklyOffDays,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/admin/shifts/${editId}`, form);
        toast.success('Shift updated');
      } else {
        await api.post('/admin/shifts', form);
        toast.success('Shift created');
      }
      setShowForm(false);
      fetchShifts();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      weeklyOffDays: f.weeklyOffDays.includes(day)
        ? f.weeklyOffDays.filter(d => d !== day)
        : [...f.weeklyOffDays, day],
    }));
  };

  if (loading) return <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-32 w-full" />)}</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shifts"
        subtitle={`${shifts.length} shift${shifts.length === 1 ? '' : 's'} configured`}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Shift</Button>}
      />

      {shifts.length === 0 ? (
        <Card className="p-10">
          <div className="text-center">
            <Timer className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No shifts configured yet.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map(s => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{s.name}</h3>
                    {!s.isActive && <Badge variant="default">Inactive</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-primary tabular mt-1.5">{formatTime(s.startTime)} - {formatTime(s.endTime)}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="default">Grace: {s.graceMinutes}min</Badge>
                    <Badge variant="info">{s.employeeCount} employees</Badge>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {DAY_NAMES.map((d, i) => (
                      <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${(s.weeklyOffDays as number[]).includes(i) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{d}</span>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}><Edit className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Shift' : 'Create Shift'} className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Shift Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time *" type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required />
            <Input label="End Time *" type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Grace (min)" type="number" value={String(form.graceMinutes)} onChange={e => setForm({...form, graceMinutes: Number(e.target.value)})} />
            <Input label="Full Day (min)" type="number" value={String(form.minFullDayMinutes)} onChange={e => setForm({...form, minFullDayMinutes: Number(e.target.value)})} />
            <Input label="Half Day (min)" type="number" value={String(form.halfDayMinutes)} onChange={e => setForm({...form, halfDayMinutes: Number(e.target.value)})} />
          </div>
          <Input label="Overtime Threshold (min)" type="number" value={String(form.overtimeThresholdMinutes)} onChange={e => setForm({...form, overtimeThresholdMinutes: Number(e.target.value)})} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Weekly Off Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((d, i) => (
                <button type="button" key={i}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.weeklyOffDays.includes(i) ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                  onClick={() => toggleDay(i)}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
