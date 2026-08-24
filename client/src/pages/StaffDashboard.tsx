import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { MapPin, AlertTriangle, CheckCircle2, Clock, Timer, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function minutesToHuman(m: number) {
  if (!m || m <= 0) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function formatTime(isoStr?: string) {
  if (!isoStr) return '--';
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

function formatTimeShort(timeStr?: string) {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { getLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [attendance, setAttendance] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [today, setToday] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  // Late reason modal
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [pendingLocation, setPendingLocation] = useState<any>(null);
  const [lateInfo, setLateInfo] = useState('');

  // Early checkout modal
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');

  useEffect(() => {
    fetchToday();
    fetchSummary();
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchToday = async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setAttendance(data.data.attendance);
      setShift(data.data.shift);
      setToday(data.data.today);
      setCurrentTime(data.data.currentTime);
    } catch { } finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/attendance/history');
      setSummary(data.data.summary);
    } catch { }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const loc = await getLocation();

      // First try without late reason
      try {
        const { data } = await api.post('/attendance/check-in', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
        toast.success(data.data.message);
        fetchToday();
        fetchSummary();
      } catch (err: any) {
        if (err.response?.data?.error?.code === 'LATE_REASON_REQUIRED') {
          setPendingLocation(loc);
          setLateInfo(err.response.data.error.message);
          setShowLateModal(true);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      if (!err.response?.data?.error?.code?.includes('LATE')) {
        toast.error(err.response?.data?.error?.message || err.message || 'Check-in failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitLateCheckIn = async () => {
    if (!lateReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-in', {
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude,
        accuracy: pendingLocation.accuracy,
        lateReason: lateReason.trim(),
      });
      toast.success(data.data.message);
      setShowLateModal(false);
      setLateReason('');
      fetchToday();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const loc = await getLocation();
      try {
        const { data } = await api.post('/attendance/check-out', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
        toast.success(data.data.message);
        fetchToday();
        fetchSummary();
      } catch (err: any) {
        if (err.response?.data?.error?.code === 'EARLY_CHECKOUT_REASON_REQUIRED') {
          setPendingLocation(loc);
          setLateInfo(err.response.data.error.message);
          setShowEarlyModal(true);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      if (!err.response?.data?.error?.code?.includes('EARLY')) {
        toast.error(err.response?.data?.error?.message || err.message || 'Check-out failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitEarlyCheckOut = async () => {
    if (!earlyCheckoutReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-out', {
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude,
        accuracy: pendingLocation.accuracy,
        earlyCheckoutReason: earlyCheckoutReason.trim(),
      });
      toast.success(data.data.message);
      setShowEarlyModal(false);
      setEarlyCheckoutReason('');
      fetchToday();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const dateStr = today
    ? new Date(today + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : '';

  const hasCheckedIn = !!attendance?.checkInAt;
  const hasCheckedOut = !!attendance?.checkOutAt;
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-48 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-20" /><div className="skeleton h-20" />
          <div className="skeleton h-20" /><div className="skeleton h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a33] via-[#1e2c4f] to-primary-dark p-6 sm:p-8 text-white">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary-light/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-accent-light/20 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar name={fullName} className="h-16 w-16 text-xl ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="text-sm text-slate-300">{dateStr}</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{greeting()}, {user?.firstName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {shift ? (
                <Badge variant="info" className="bg-white/10 text-white border-white/20">Shift: {formatTimeShort(shift.startTime)} - {formatTimeShort(shift.endTime)}</Badge>
              ) : (
                <Badge variant="warning">No shift assigned</Badge>
              )}
              <span className="text-xs text-slate-300">{user?.employeeId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-[100%]" />
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-ink">Today's Attendance</h3>
            </div>
            <span className="text-lg font-mono tabular text-primary font-semibold bg-primary-soft px-3 py-1 rounded-lg">{currentTime}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Check-in</p>
              <p className="text-lg font-semibold text-ink tabular mt-0.5">{formatTime(attendance?.checkInAt)}</p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Check-out</p>
              <p className="text-lg font-semibold text-ink tabular mt-0.5">{formatTime(attendance?.checkOutAt)}</p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Worked</p>
              <p className="text-lg font-semibold text-ink tabular mt-0.5">{attendance?.workedMinutes ? minutesToHuman(attendance.workedMinutes) : '--'}</p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
              <div className="mt-1.5">
                {attendance ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={attendance.mainStatus} />
                    {attendance.isLate && <Badge variant="orange">Late</Badge>}
                    {attendance.hasOvertime && <Badge variant="info">OT</Badge>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not checked in</p>
                )}
              </div>
            </div>
          </div>

          {attendance?.isLate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Late by {attendance.lateMinutes} minutes
                {attendance.lateStreak > 1 && <Badge variant="orange">Streak: {attendance.lateStreak}</Badge>}
              </div>
              {attendance.halfDayReason === 'CONSECUTIVE_LATE_POLICY' && (
                <p className="text-amber-600 mt-1">Half Day applied due to consecutive late policy.</p>
              )}
              {attendance.lateReason && <p className="text-slate-600 mt-1">Reason: {attendance.lateReason}</p>}
            </div>
          )}

          {geoError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {geoError}
            </div>
          )}

          {/* Action Button */}
          {!hasCheckedIn ? (
            <Button
              size="lg"
              className="w-full text-lg py-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCheckIn}
              loading={actionLoading || geoLoading}
            >
              <CheckCircle2 className="h-6 w-6" />
              CHECK IN
            </Button>
          ) : !hasCheckedOut ? (
            <Button
              size="lg"
              variant="danger"
              className="w-full text-lg py-4"
              onClick={handleCheckOut}
              loading={actionLoading || geoLoading}
            >
              <Clock className="h-6 w-6" />
              CHECK OUT
            </Button>
          ) : (
            <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
              <p className="font-medium text-emerald-700">Day Complete</p>
              <p className="text-sm text-emerald-600">Worked: {minutesToHuman(attendance.workedMinutes || 0)}</p>
              {attendance.hasOvertime && <p className="text-sm text-blue-600">Overtime: {minutesToHuman(attendance.overtimeMinutes || 0)}</p>}
            </div>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">This Month</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Present', value: summary.presentDays, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
              { label: 'Half Days', value: summary.halfDays, color: 'text-amber-600', icon: Timer, bg: 'bg-amber-50' },
              { label: 'Leaves', value: summary.leaveDays, color: 'text-blue-600', icon: Calendar, bg: 'bg-blue-50' },
              { label: 'Late', value: summary.lateDays, color: 'text-orange-600', icon: AlertTriangle, bg: 'bg-orange-50' },
              { label: 'Hours', value: summary.totalWorkedHours, color: 'text-primary', icon: Clock, bg: 'bg-primary-soft' },
              { label: 'Overtime', value: summary.totalOvertime, color: 'text-purple-600', icon: TrendingUp, bg: 'bg-purple-50' },
            ].map(({ label, value, color, icon: Icon, bg }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4.5 w-4.5 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xl font-bold ${color} tabular leading-tight truncate`}>{value}</p>
                    <p className="text-xs text-slate-500 truncate">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Late Reason Modal */}
      <Modal open={showLateModal} onClose={() => setShowLateModal(false)} title="Late Check-in">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">{lateInfo}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for late arrival *</label>
            <textarea
              className="w-full rounded-lg border border-border-soft px-3.5 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
              rows={3}
              value={lateReason}
              onChange={e => setLateReason(e.target.value)}
              placeholder="Please provide a reason..."
              required
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowLateModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={submitLateCheckIn} loading={actionLoading} className="flex-1">Submit & Check In</Button>
          </div>
        </div>
      </Modal>

      {/* Early Checkout Modal */}
      <Modal open={showEarlyModal} onClose={() => setShowEarlyModal(false)} title="Early Checkout">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">{lateInfo}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for early checkout *</label>
            <textarea
              className="w-full rounded-lg border border-border-soft px-3.5 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
              rows={3}
              value={earlyCheckoutReason}
              onChange={e => setEarlyCheckoutReason(e.target.value)}
              placeholder="Please provide a reason..."
              required
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowEarlyModal(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={submitEarlyCheckOut} loading={actionLoading} className="flex-1">Submit & Check Out</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
