import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', phone: '',
    password: '', role: 'staff', shiftId: '', locationId: '', department: '', designation: '', joiningDate: '',
  });

  useEffect(() => { fetchEmployees(); fetchMeta(); }, [pagination.page, search]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/employees', {
        params: { page: pagination.page, limit: pagination.limit, search: search || undefined },
      });
      setEmployees(data.data.employees);
      setPagination(data.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  const fetchMeta = async () => {
    try {
      const [s, l] = await Promise.all([api.get('/admin/shifts'), api.get('/admin/locations')]);
      setShifts(s.data.data.shifts);
      setLocations(l.data.data.locations);
    } catch { }
  };

  let searchTimer: ReturnType<typeof setTimeout>;
  const onSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 400);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        shiftId: form.shiftId ? Number(form.shiftId) : undefined,
        locationId: form.locationId ? Number(form.locationId) : undefined,
      };
      await api.post('/admin/employees', payload);
      toast.success('Employee created');
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', username: '', email: '', phone: '', password: '', role: 'staff', shiftId: '', locationId: '', department: '', designation: '', joiningDate: '' });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Employees</h2>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Employee</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm"
          placeholder="Search by name, email, employee ID, phone..."
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Employee</th>
              <th className="px-4 py-3 font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 font-medium text-gray-500">Shift</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500">@{emp.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{emp.employeeId}</td>
                <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                <td className="px-4 py-3"><Badge variant={emp.role === 'admin' ? 'info' : 'default'}>{emp.role}</Badge></td>
                <td className="px-4 py-3 text-gray-600">{emp.shiftName || '-'}</td>
                <td className="px-4 py-3"><Badge variant={emp.employmentStatus === 'active' ? 'success' : 'danger'}>{emp.employmentStatus}</Badge></td>
                <td className="px-4 py-3">
                  <Link to={`/admin/employees/${emp.id}`} className="text-accent hover:underline text-sm">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-2">
        {employees.map(emp => (
          <Link key={emp.id} to={`/admin/employees/${emp.id}`}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-gray-500">{emp.employeeId} · {emp.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={emp.employmentStatus === 'active' ? 'success' : 'danger'}>{emp.employmentStatus}</Badge>
                  <Badge variant={emp.role === 'admin' ? 'info' : 'default'}>{emp.role}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">Showing {employees.length} of {pagination.total}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm py-1.5 px-3">{pagination.page}/{pagination.totalPages}</span>
            <Button size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Employee" className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required />
            <Input label="Last Name *" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required />
          </div>
          <Input label="Username *" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <Input label="Phone *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Leave empty to set later" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.shiftId} onChange={e => setForm({...form, shiftId: e.target.value})}>
                <option value="">None</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.locationId} onChange={e => setForm({...form, locationId: e.target.value})}>
              <option value="">None</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
            <Input label="Designation" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} />
          </div>
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1">Create Employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
