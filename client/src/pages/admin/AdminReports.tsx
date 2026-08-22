import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/attendance/export', { params: { month, year }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
      a.download = `DTI_Attendance_${months[month]}_${year}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const exportCSV = async () => {
    try {
      const response = await api.get('/admin/attendance/export-csv', { params: { month, year }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `DTI_Attendance_${month}_${year}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Reports</h2>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Attendance Report</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportExcel} loading={exporting}><Download className="h-4 w-4" /> Export Excel (.xlsx)</Button>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
        </div>
      </Card>
    </div>
  );
}
