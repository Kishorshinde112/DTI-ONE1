import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try { const { data } = await api.get('/admin/settings'); setSettings(data.data.settings); } catch { } finally { setLoading(false); }
  };

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      await api.patch(`/admin/settings/${key}`, { value: settings[key] });
      toast.success('Setting saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setSaving(''); }
  };

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="skeleton h-64 w-full" />;

  const sections = [
    {
      title: 'General',
      items: [
        { key: 'company_name', label: 'Company Name', type: 'text' },
        { key: 'timezone', label: 'Timezone', type: 'text' },
        { key: 'employee_id_prefix', label: 'Employee ID Prefix', type: 'text' },
        { key: 'allow_signup', label: 'Allow Staff Signup', type: 'select', options: ['true', 'false'] },
      ],
    },
    {
      title: 'Attendance Policy',
      items: [
        { key: 'consecutive_late_threshold', label: 'Consecutive Late Threshold (days)', type: 'number' },
        { key: 'consecutive_late_action', label: 'Action on Threshold', type: 'select', options: ['half_day', 'warning'] },
        { key: 'max_gps_accuracy', label: 'Max GPS Accuracy (meters)', type: 'number' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      {sections.map(section => (
        <Card key={section.title}>
          <CardContent>
            <h3 className="font-semibold text-gray-900 mb-4">{section.title}</h3>
            <div className="space-y-4">
              {section.items.map(item => (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex-1">
                    {item.type === 'select' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={settings[item.key] || ''} onChange={e => update(item.key, e.target.value)}>
                          {item.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ) : (
                      <Input label={item.label} type={item.type} value={settings[item.key] || ''} onChange={e => update(item.key, e.target.value)} />
                    )}
                  </div>
                  <Button size="sm" onClick={() => saveSetting(item.key)} loading={saving === item.key}>Save</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
