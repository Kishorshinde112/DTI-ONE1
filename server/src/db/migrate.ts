import { sql } from 'drizzle-orm';
import { db, pool } from './index.js';
import * as schema from './schema.js';

async function migrate() {
  console.log('Running migrations...');
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        employee_id VARCHAR(20) NOT NULL,
        role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
        profile_photo VARCHAR(500),
        department VARCHAR(100),
        designation VARCHAR(100),
        joining_date DATE,
        employment_status ENUM('active', 'inactive', 'terminated') NOT NULL DEFAULT 'active',
        account_status ENUM('active', 'disabled', 'pending_verification') NOT NULL DEFAULT 'pending_verification',
        google_id VARCHAR(255),
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        shift_id INT,
        location_id INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX users_email_idx (email),
        UNIQUE INDEX users_username_idx (username),
        UNIQUE INDEX users_employee_id_idx (employee_id),
        INDEX users_role_idx (role),
        INDEX users_account_status_idx (account_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ users table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose ENUM('registration', 'forgot_password', 'verification') NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX otp_email_idx (email),
        INDEX otp_purpose_idx (purpose)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ otp_codes table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        grace_minutes INT NOT NULL DEFAULT 15,
        late_threshold_minutes INT NOT NULL DEFAULT 0,
        min_full_day_minutes INT NOT NULL DEFAULT 480,
        half_day_minutes INT NOT NULL DEFAULT 240,
        overtime_threshold_minutes INT NOT NULL DEFAULT 0,
        early_checkin_allowed BOOLEAN NOT NULL DEFAULT TRUE,
        weekly_off_days JSON NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ shifts table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS office_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        radius_meters INT NOT NULL DEFAULT 100,
        max_accuracy_meters INT NOT NULL DEFAULT 150,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ office_locations table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        shift_id INT,
        scheduled_start_time TIME,
        scheduled_end_time TIME,
        scheduled_grace_minutes INT,
        check_in_at TIMESTAMP NULL,
        check_out_at TIMESTAMP NULL,
        check_in_latitude DECIMAL(10,7),
        check_in_longitude DECIMAL(10,7),
        check_in_accuracy DECIMAL(8,2),
        check_out_latitude DECIMAL(10,7),
        check_out_longitude DECIMAL(10,7),
        check_out_accuracy DECIMAL(8,2),
        check_in_ip VARCHAR(50),
        check_out_ip VARCHAR(50),
        worked_minutes INT DEFAULT 0,
        late_minutes INT DEFAULT 0,
        early_checkin_minutes INT DEFAULT 0,
        early_checkout_minutes INT DEFAULT 0,
        overtime_minutes INT DEFAULT 0,
        main_status ENUM('PRESENT','FULL_DAY','HALF_DAY','LEAVE','PAID_LEAVE','UNPAID_LEAVE','SICK_LEAVE','ABSENT','WEEKLY_OFF','HOLIDAY') NOT NULL DEFAULT 'PRESENT',
        is_late BOOLEAN NOT NULL DEFAULT FALSE,
        is_early_checkout BOOLEAN NOT NULL DEFAULT FALSE,
        has_overtime BOOLEAN NOT NULL DEFAULT FALSE,
        is_early_checkin BOOLEAN NOT NULL DEFAULT FALSE,
        late_streak INT NOT NULL DEFAULT 0,
        half_day_reason VARCHAR(100),
        late_reason TEXT,
        early_checkout_reason TEXT,
        employee_note TEXT,
        admin_note TEXT,
        location_id INT,
        check_in_location_verified BOOLEAN DEFAULT FALSE,
        check_out_location_verified BOOLEAN DEFAULT FALSE,
        check_in_user_agent VARCHAR(500),
        check_out_user_agent VARCHAR(500),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX attendance_employee_date_idx (employee_id, attendance_date),
        INDEX attendance_date_idx (attendance_date),
        INDEX attendance_status_idx (main_status),
        INDEX attendance_employee_idx (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ attendance_records table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_adjustments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attendance_id INT NOT NULL,
        adjusted_by INT NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        reason TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX adjustment_attendance_idx (attendance_id),
        INDEX adjustment_by_idx (adjusted_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ attendance_adjustments table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
        requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
        max_days_per_year INT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ leave_types table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type_id INT NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        total_days INT NOT NULL DEFAULT 1,
        reason TEXT NOT NULL,
        attachment_path VARCHAR(500),
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT,
        review_note TEXT,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX leave_employee_idx (employee_id),
        INDEX leave_dates_idx (from_date, to_date),
        INDEX leave_status_idx (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ leave_requests table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        date DATE NOT NULL,
        is_optional BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX holiday_date_idx (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ holidays table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ system_settings table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_id INT,
        actor_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(100) NOT NULL,
        target_id INT,
        old_value JSON,
        new_value JSON,
        reason TEXT,
        ip_address VARCHAR(50),
        user_agent VARCHAR(500),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX audit_actor_idx (actor_id),
        INDEX audit_target_idx (target_entity, target_id),
        INDEX audit_created_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ audit_logs table');

    // Insert default system settings
    await connection.query(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('company_name', 'Digital to Infinity', 'Company name'),
      ('timezone', 'Asia/Kolkata', 'Business timezone'),
      ('employee_id_prefix', 'DTI', 'Employee ID prefix'),
      ('consecutive_late_threshold', '4', 'Number of consecutive late days before half-day is applied'),
      ('consecutive_late_action', 'half_day', 'Action when consecutive late threshold is exceeded'),
      ('max_gps_accuracy', '150', 'Maximum acceptable GPS accuracy in meters'),
      ('allow_signup', 'true', 'Whether new staff signups are allowed')
    `);
    console.log('✓ default system settings');

    // Insert default leave types
    await connection.query(`
      INSERT IGNORE INTO leave_types (name, code, is_paid, requires_approval) VALUES
      ('Paid Leave', 'PL', TRUE, TRUE),
      ('Unpaid Leave', 'UL', FALSE, TRUE),
      ('Sick Leave', 'SL', TRUE, TRUE),
      ('Other', 'OT', FALSE, TRUE)
    `);
    console.log('✓ default leave types');

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
