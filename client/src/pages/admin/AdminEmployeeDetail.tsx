import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ArrowLeft, KeyRound } from 'lucide-react';
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

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const empStatus = employee.employmentStatus === 'active' ? 'success' : 'danger';
  const accountStatus = employee.accountStatus === 'active' ? 'success' : 'default';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/employees')} aria-label="Back to employees"><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-xl font-bold text-ink">{fullName}</h2>
          <p className="text-sm text-slate-500">{employee.employeeId}</p>
        </div>
      </div>

      {/* Employee summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a33] via-[#1e2c4f] to-primary-dark p-6 text-white">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary-light/20 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center gap-5">
          <Avatar name={fullName} className="h-16 w-16 text-xl ring-2 ring-white/20" />
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{fullName}</h3>
            <p className="text-sm text-slate-300 mt-0.5">{employee.designation || employee.department || 'No designation'}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant={empStatus} dot>{employee.employmentStatus}</Badge>
              <Badge variant={employee.role === 'admin' ? 'info' : 'default'}>{employee.role}</Badge>
              <Badge variant={accountStatus} dot>Account: {employee.accountStatus}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="font-semibold text-ink">Employee Details</h3>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={handleResetPassword}><KeyRound className="h-4 w-4" /> Reset Password</Button>
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
          <Input label="Email" type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} disabled={!editing} />
          <Input label="Phone" type="tel" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} disabled={!editing} />
          <Input label="Employee ID" value={form.employeeId || ''} onChange={e => setForm({...form, employeeId: e.target.value})} disabled={!editing} />
          <Input label="Department" value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})} disabled={!editing} />
          <Input label="Designation" value={form.designation || ''} onChange={e => setForm({...form, designation: e.target.value})} disabled={!editing} />

          <Select label="Role" value={form.role || 'staff'} onChange={e => setForm({...form, role: e.target.value})} disabled={!editing}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>

          <Select label="Employment Status" value={form.employmentStatus || 'active'} onChange={e => setForm({...form, employmentStatus: e.target.value})} disabled={!editing}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </Select>

          <Select label="Account Status" value={form.accountStatus || 'active'} onChange={e => setForm({...form, accountStatus: e.target.value})} disabled={!editing}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>

          <Select label="Shift" value={form.shiftId || ''} onChange={e => setForm({...form, shiftId: e.target.value ? Number(e.target.value) : null})} disabled={!editing}>
            <option value="">None</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <Select label="Office Location" value={form.locationId || ''} onChange={e => setForm({...form, locationId: e.target.value ? Number(e.target.value) : null})} disabled={!editing}>
            <option value="">None</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
      </Card>
    </div>
  );
}
