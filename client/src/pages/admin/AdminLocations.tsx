import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Office Locations</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Location</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map(l => (
          <Card key={l.id}>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-danger" />
                    <h3 className="font-semibold text-gray-900">{l.name}</h3>
                  </div>
                  {l.address && <p className="text-sm text-gray-500 mt-1">{l.address}</p>}
                  <p className="text-xs text-gray-400 mt-1">{l.latitude}, {l.longitude}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="default">Radius: {l.radiusMeters}m</Badge>
                    <Badge variant="info">{l.employeeCount} employees</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(l)}><Edit className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
