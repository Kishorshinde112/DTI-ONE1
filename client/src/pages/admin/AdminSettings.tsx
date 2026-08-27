import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
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
      description: 'Organization-wide information and defaults',
      items: [
        { key: 'company_name', label: 'Company Name', type: 'text' },
        { key: 'timezone', label: 'Timezone', type: 'text' },
        { key: 'employee_id_prefix', label: 'Employee ID Prefix', type: 'text' },
        { key: 'allow_signup', label: 'Allow Staff Signup', type: 'select', options: ['true', 'false'] },
      ],
    },
    {
      title: 'Attendance Policy',
      description: 'Rules governing attendance and late policy',
      items: [
        { key: 'consecutive_late_threshold', label: 'Consecutive Late Threshold (days)', type: 'number' },
        { key: 'consecutive_late_action', label: 'Action on Threshold', type: 'select', options: ['half_day', 'warning'] },
        { key: 'max_gps_accuracy', label: 'Max GPS Accuracy (meters)', type: 'number' },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Manage system configuration" />

      <div className="max-w-3xl space-y-5">
        {sections.map(section => (
          <Card key={section.title} className="p-6">
            <h3 className="font-semibold text-slate-900">{section.title}</h3>
            <p className="text-sm text-slate-500 mb-5">{section.description}</p>
            <div className="space-y-4">
              {section.items.map(item => (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex-1">
                    {item.type === 'select' ? (
                      <Select
                        label={item.label}
                        value={settings[item.key] || ''}
                        onChange={e => update(item.key, e.target.value)}
                      >
                        {item.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    ) : (
                      <Input label={item.label} type={item.type} value={settings[item.key] || ''} onChange={e => update(item.key, e.target.value)} />
                    )}
                  </div>
                  <Button size="md" onClick={() => saveSetting(item.key)} loading={saving === item.key}>Save</Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
