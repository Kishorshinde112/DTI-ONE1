import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminEmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => { fetchEmployee(); fetchMeta(); }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data } = await api.get(`/admin/employees/${id}`);
      setEmployee(data.data.employee);
      setForm(data.data.employee);
    } catch { toast.error('Employee not found'); navigate('/admin/employees'); } finally { setLoading(false); }
  };

  const fetchMeta = async () => {
    try {
      const [s, l] = await Promise.all([api.get('/admin/shifts'), api.get('/admin/locations')]);
      setShifts(s.data.data.shifts);
      setLocations(l.data.data.locations);
    } catch { }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      for (const key of ['firstName', 'lastName', 'username', 'email', 'phone', 'role', 'department', 'designation', 'shiftId', 'locationId', 'employmentStatus', 'accountStatus', 'employeeId']) {
        if (form[key] !== employee[key]) updates[key] = form[key] || null;
      }
      if (Object.keys(updates).length === 0) { toast('No changes'); setEditing(false); return; }
      await api.patch(`/admin/employees/${id}`, updates);
      toast.success('Updated successfully');
      setEditing(false);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('Enter new password (min 8 chars, 1 upper, 1 lower, 1 number, 1 special):');
    if (!newPassword) return;
    try {
      await api.post(`/admin/employees/${id}/reset-password`, { newPassword });
      toast.success('Password reset');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!employee) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/employees')}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h2>
          <p className="text-sm text-gray-500">{employee.employeeId}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Employee Details</h3>
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={handleResetPassword}>Reset Password</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm(employee); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} disabled={!editing} />
            <Input label="Last Name" value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} disabled={!editing} />
            <Input label="Username" value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} disabled={!editing} />
            <Input label="Email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} disabled={!editing} />
            <Input label="Phone" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} disabled={!editing} />
            <Input label="Employee ID" value={form.employeeId || ''} onChange={e => setForm({...form, employeeId: e.target.value})} disabled={!editing} />
            <Input label="Department" value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})} disabled={!editing} />
            <Input label="Designation" value={form.designation || ''} onChange={e => setForm({...form, designation: e.target.value})} disabled={!editing} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50" value={form.role || 'staff'} onChange={e => setForm({...form, role: e.target.value})} disabled={!editing}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50" value={form.employmentStatus || 'active'} onChange={e => setForm({...form, employmentStatus: e.target.value})} disabled={!editing}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50" value={form.accountStatus || 'active'} onChange={e => setForm({...form, accountStatus: e.target.value})} disabled={!editing}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50" value={form.shiftId || ''} onChange={e => setForm({...form, shiftId: e.target.value ? Number(e.target.value) : null})} disabled={!editing}>
                <option value="">None</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50" value={form.locationId || ''} onChange={e => setForm({...form, locationId: e.target.value ? Number(e.target.value) : null})} disabled={!editing}>
                <option value="">None</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
