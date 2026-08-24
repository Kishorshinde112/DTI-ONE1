import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Edit, MapPin } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminLocations() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 100, maxAccuracyMeters: 150 });

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    try { const { data } = await api.get('/admin/locations'); setLocations(data.data.locations); } catch { } finally { setLoading(false); }
  };

  const openCreate = () => { setEditId(null); setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 100, maxAccuracyMeters: 150 }); setShowForm(true); };

  const openEdit = (loc: any) => {
    setEditId(loc.id);
    setForm({ name: loc.name, address: loc.address || '', latitude: String(loc.latitude), longitude: String(loc.longitude), radiusMeters: loc.radiusMeters, maxAccuracyMeters: loc.maxAccuracyMeters });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
      if (editId) { await api.patch(`/admin/locations/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/locations', payload); toast.success('Created'); }
      setShowForm(false); fetchLocations();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); } finally { setSaving(false); }
  };

  if (loading) return <div className="skeleton h-40 w-full" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Office Locations"
        subtitle={`${locations.length} location${locations.length === 1 ? '' : 's'} configured`}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Location</Button>}
      />

      {locations.length === 0 ? (
        <Card className="p-10">
          <div className="text-center">
            <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No office locations configured yet.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map(l => (
            <Card key={l.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                      <MapPin className="h-4 w-4 text-danger" />
                    </div>
                    <h3 className="font-semibold text-ink truncate">{l.name}</h3>
                  </div>
                  {l.address && <p className="text-sm text-slate-500 mt-2">{l.address}</p>}
                  <p className="text-xs text-slate-400 mt-1 font-mono">{l.latitude}, {l.longitude}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="default">Radius: {l.radiusMeters}m</Badge>
                    <Badge variant="info">{l.employeeCount} employees</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(l)} aria-label={`Edit ${l.name}`}><Edit className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Location' : 'Add Location'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Office Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <Input label="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude *" type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} required />
            <Input label="Longitude *" type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Radius (meters)" type="number" value={String(form.radiusMeters)} onChange={e => setForm({...form, radiusMeters: Number(e.target.value)})} />
            <Input label="Max Accuracy (meters)" type="number" value={String(form.maxAccuracyMeters)} onChange={e => setForm({...form, maxAccuracyMeters: Number(e.target.value)})} />
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
