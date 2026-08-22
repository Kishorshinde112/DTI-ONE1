import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Timer, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{greeting()}, {user?.firstName}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        {shift && (
          <p className="text-sm text-gray-500">
            Shift: {formatTimeShort(shift.startTime)} - {formatTimeShort(shift.endTime)} | Grace: {shift.graceMinutes}min
          </p>
        )}
      </div>

      {/* Today's Attendance Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100%]" />
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
            <span className="text-lg font-mono text-primary font-semibold">{currentTime}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Check-in</p>
              <p className="text-lg font-semibold text-gray-900">{formatTime(attendance?.checkInAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Check-out</p>
              <p className="text-lg font-semibold text-gray-900">{formatTime(attendance?.checkOutAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Worked</p>
              <p className="text-lg font-semibold text-gray-900">{attendance?.workedMinutes ? minutesToHuman(attendance.workedMinutes) : '--'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
              {attendance ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusBadge status={attendance.mainStatus} />
                  {attendance.isLate && <Badge variant="orange">Late</Badge>}
                  {attendance.hasOvertime && <Badge variant="info">OT</Badge>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Not checked in</p>
              )}
            </div>
          </div>

          {attendance?.isLate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Late by {attendance.lateMinutes} minutes
                {attendance.lateStreak > 1 && <Badge variant="orange">Streak: {attendance.lateStreak}</Badge>}
              </div>
              {attendance.halfDayReason === 'CONSECUTIVE_LATE_POLICY' && (
                <p className="text-amber-600 mt-1">Half Day applied due to consecutive late policy.</p>
              )}
              {attendance.lateReason && <p className="text-gray-600 mt-1">Reason: {attendance.lateReason}</p>}
            </div>
          )}

          {geoError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-center gap-2">
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
            <div className="text-center py-3 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
              <p className="font-medium text-emerald-700">Day Complete</p>
              <p className="text-sm text-emerald-600">Worked: {minutesToHuman(attendance.workedMinutes || 0)}</p>
              {attendance.hasOvertime && <p className="text-sm text-blue-600">Overtime: {minutesToHuman(attendance.overtimeMinutes || 0)}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{summary.presentDays}</p>
              <p className="text-xs text-gray-500 mt-1">Present</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.halfDays}</p>
              <p className="text-xs text-gray-500 mt-1">Half Days</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.leaveDays}</p>
              <p className="text-xs text-gray-500 mt-1">Leaves</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.lateDays}</p>
              <p className="text-xs text-gray-500 mt-1">Late</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{summary.totalWorkedHours}</p>
              <p className="text-xs text-gray-500 mt-1">Hours</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{summary.totalOvertime}</p>
              <p className="text-xs text-gray-500 mt-1">Overtime</p>
            </div>
          </Card>
        </div>
      )}

      {/* Late Reason Modal */}
      <Modal open={showLateModal} onClose={() => setShowLateModal(false)} title="Late Check-in">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700">{lateInfo}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for late arrival *</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700">{lateInfo}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for early checkout *</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
