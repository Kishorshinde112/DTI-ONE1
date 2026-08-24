export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  employeeId: string;
  role: 'admin' | 'staff';
  department?: string;
  designation?: string;
  profilePhoto?: string;
  joiningDate?: string;
  shiftId?: number;
  locationId?: number;
  employmentStatus: string;
  accountStatus: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  attendanceDate: string;
  shiftId?: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  scheduledGraceMinutes?: number;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes?: number;
  lateMinutes?: number;
  earlyCheckinMinutes?: number;
  earlyCheckoutMinutes?: number;
  overtimeMinutes?: number;
  mainStatus: string;
  isLate: boolean;
  isEarlyCheckout: boolean;
  hasOvertime: boolean;
  isEarlyCheckin: boolean;
  lateStreak: number;
  halfDayReason?: string;
  lateReason?: string;
  earlyCheckoutReason?: string;
  employeeNote?: string;
  adminNote?: string;
  checkInLocationVerified?: boolean;
  checkOutLocationVerified?: boolean;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  minFullDayMinutes: number;
  halfDayMinutes: number;
  overtimeThresholdMinutes: number;
  earlyCheckinAllowed: boolean;
  weeklyOffDays: number[];
  isActive: boolean;
  employeeCount?: number;
}

export interface OfficeLocation {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number;
  isActive: boolean;
  employeeCount?: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  createdAt: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  maxDaysPerYear?: number;
  isActive: boolean;
}

export interface AuditLog {
  id: number;
  actorId?: number;
  actorEmail?: string;
  action: string;
  targetEntity: string;
  targetId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
