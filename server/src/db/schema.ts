import {
  mysqlTable,
  varchar,
  int,
  text,
  boolean,
  timestamp,
  date,
  time,
  decimal,
  mysqlEnum,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/mysql-core';

// ── Users ──
export const users = mysqlTable(
  'users',
  {
    id: int('id').primaryKey().autoincrement(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    employeeId: varchar('employee_id', { length: 20 }).notNull(),
    role: mysqlEnum('role', ['admin', 'staff']).notNull().default('staff'),
    profilePhoto: varchar('profile_photo', { length: 500 }),
    department: varchar('department', { length: 100 }),
    designation: varchar('designation', { length: 100 }),
    joiningDate: date('joining_date'),
    employmentStatus: mysqlEnum('employment_status', ['active', 'inactive', 'terminated']).notNull().default('active'),
    accountStatus: mysqlEnum('account_status', ['active', 'disabled', 'pending_verification']).notNull().default('pending_verification'),
    googleId: varchar('google_id', { length: 255 }),
    emailVerified: boolean('email_verified').notNull().default(false),
    shiftId: int('shift_id'),
    locationId: int('location_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    uniqueIndex('users_username_idx').on(table.username),
    uniqueIndex('users_employee_id_idx').on(table.employeeId),
    index('users_role_idx').on(table.role),
    index('users_account_status_idx').on(table.accountStatus),
  ]
);

// ── OTP Codes ──
export const otpCodes = mysqlTable(
  'otp_codes',
  {
    id: int('id').primaryKey().autoincrement(),
    email: varchar('email', { length: 255 }).notNull(),
    code: varchar('code', { length: 10 }).notNull(),
    purpose: mysqlEnum('purpose', ['registration', 'forgot_password', 'verification']).notNull(),
    attempts: int('attempts').notNull().default(0),
    used: boolean('used').notNull().default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('otp_email_idx').on(table.email),
    index('otp_purpose_idx').on(table.purpose),
  ]
);

// ── Shifts ──
export const shifts = mysqlTable('shifts', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  graceMinutes: int('grace_minutes').notNull().default(15),
  lateThresholdMinutes: int('late_threshold_minutes').notNull().default(0),
  minFullDayMinutes: int('min_full_day_minutes').notNull().default(480),
  halfDayMinutes: int('half_day_minutes').notNull().default(240),
  overtimeThresholdMinutes: int('overtime_threshold_minutes').notNull().default(0),
  earlyCheckinAllowed: boolean('early_checkin_allowed').notNull().default(true),
  weeklyOffDays: json('weekly_off_days').$type<number[]>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ── Office Locations ──
export const officeLocations = mysqlTable('office_locations', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 200 }).notNull(),
  address: text('address'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  radiusMeters: int('radius_meters').notNull().default(100),
  maxAccuracyMeters: int('max_accuracy_meters').notNull().default(150),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ── Attendance Records ──
export const attendanceRecords = mysqlTable(
  'attendance_records',
  {
    id: int('id').primaryKey().autoincrement(),
    employeeId: int('employee_id').notNull(),
    attendanceDate: date('attendance_date').notNull(),
    shiftId: int('shift_id'),

    scheduledStartTime: time('scheduled_start_time'),
    scheduledEndTime: time('scheduled_end_time'),
    scheduledGraceMinutes: int('scheduled_grace_minutes'),

    checkInAt: timestamp('check_in_at'),
    checkOutAt: timestamp('check_out_at'),

    checkInLatitude: decimal('check_in_latitude', { precision: 10, scale: 7 }),
    checkInLongitude: decimal('check_in_longitude', { precision: 10, scale: 7 }),
    checkInAccuracy: decimal('check_in_accuracy', { precision: 8, scale: 2 }),

    checkOutLatitude: decimal('check_out_latitude', { precision: 10, scale: 7 }),
    checkOutLongitude: decimal('check_out_longitude', { precision: 10, scale: 7 }),
    checkOutAccuracy: decimal('check_out_accuracy', { precision: 8, scale: 2 }),

    checkInIp: varchar('check_in_ip', { length: 50 }),
    checkOutIp: varchar('check_out_ip', { length: 50 }),

    workedMinutes: int('worked_minutes').default(0),
    lateMinutes: int('late_minutes').default(0),
    earlyCheckinMinutes: int('early_checkin_minutes').default(0),
    earlyCheckoutMinutes: int('early_checkout_minutes').default(0),
    overtimeMinutes: int('overtime_minutes').default(0),

    mainStatus: mysqlEnum('main_status', [
      'PRESENT', 'FULL_DAY', 'HALF_DAY', 'LEAVE', 'PAID_LEAVE',
      'UNPAID_LEAVE', 'SICK_LEAVE', 'ABSENT', 'WEEKLY_OFF', 'HOLIDAY',
    ]).notNull().default('PRESENT'),

    isLate: boolean('is_late').notNull().default(false),
    isEarlyCheckout: boolean('is_early_checkout').notNull().default(false),
    hasOvertime: boolean('has_overtime').notNull().default(false),
    isEarlyCheckin: boolean('is_early_checkin').notNull().default(false),

    lateStreak: int('late_streak').notNull().default(0),
    halfDayReason: varchar('half_day_reason', { length: 100 }),

    lateReason: text('late_reason'),
    earlyCheckoutReason: text('early_checkout_reason'),
    employeeNote: text('employee_note'),
    adminNote: text('admin_note'),

    locationId: int('location_id'),
    checkInLocationVerified: boolean('check_in_location_verified').default(false),
    checkOutLocationVerified: boolean('check_out_location_verified').default(false),

    checkInUserAgent: varchar('check_in_user_agent', { length: 500 }),
    checkOutUserAgent: varchar('check_out_user_agent', { length: 500 }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('attendance_employee_date_idx').on(table.employeeId, table.attendanceDate),
    index('attendance_date_idx').on(table.attendanceDate),
    index('attendance_status_idx').on(table.mainStatus),
    index('attendance_employee_idx').on(table.employeeId),
  ]
);

// ── Attendance Adjustments ──
export const attendanceAdjustments = mysqlTable(
  'attendance_adjustments',
  {
    id: int('id').primaryKey().autoincrement(),
    attendanceId: int('attendance_id').notNull(),
    adjustedBy: int('adjusted_by').notNull(),
    fieldName: varchar('field_name', { length: 100 }).notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('adjustment_attendance_idx').on(table.attendanceId),
    index('adjustment_by_idx').on(table.adjustedBy),
  ]
);

// ── Leave Types ──
export const leaveTypes = mysqlTable('leave_types', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  maxDaysPerYear: int('max_days_per_year'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Leave Requests ──
export const leaveRequests = mysqlTable(
  'leave_requests',
  {
    id: int('id').primaryKey().autoincrement(),
    employeeId: int('employee_id').notNull(),
    leaveTypeId: int('leave_type_id').notNull(),
    fromDate: date('from_date').notNull(),
    toDate: date('to_date').notNull(),
    totalDays: int('total_days').notNull().default(1),
    reason: text('reason').notNull(),
    attachmentPath: varchar('attachment_path', { length: 500 }),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
    reviewedBy: int('reviewed_by'),
    reviewNote: text('review_note'),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('leave_employee_idx').on(table.employeeId),
    index('leave_dates_idx').on(table.fromDate, table.toDate),
    index('leave_status_idx').on(table.status),
  ]
);

// ── Holidays ──
export const holidays = mysqlTable(
  'holidays',
  {
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 200 }).notNull(),
    date: date('date').notNull(),
    isOptional: boolean('is_optional').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('holiday_date_idx').on(table.date)]
);

// ── System Settings ──
export const systemSettings = mysqlTable('system_settings', {
  id: int('id').primaryKey().autoincrement(),
  key: varchar('setting_key', { length: 100 }).notNull().unique(),
  value: text('setting_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ── Audit Logs ──
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: int('id').primaryKey().autoincrement(),
    actorId: int('actor_id'),
    actorEmail: varchar('actor_email', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(),
    targetEntity: varchar('target_entity', { length: 100 }).notNull(),
    targetId: int('target_id'),
    oldValue: json('old_value').$type<Record<string, unknown>>(),
    newValue: json('new_value').$type<Record<string, unknown>>(),
    reason: text('reason'),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_actor_idx').on(table.actorId),
    index('audit_target_idx').on(table.targetEntity, table.targetId),
    index('audit_created_idx').on(table.createdAt),
  ]
);
