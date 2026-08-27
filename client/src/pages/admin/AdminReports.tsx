import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
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
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Export attendance data for the period you need" />

      <div className="max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Attendance Report</h3>
              <p className="text-sm text-slate-500">Generate an Excel or CSV export of attendance records.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Select className="w-28" label="Month" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
            <Select className="w-28" label="Year" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportExcel} loading={exporting}><Download className="h-4 w-4" /> Export Excel (.xlsx)</Button>
            <Button variant="outline" onClick={exportCSV}><FileText className="h-4 w-4" /> Export CSV</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
