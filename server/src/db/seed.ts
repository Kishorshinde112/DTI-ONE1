import { pool } from './index.js';

async function seed() {
  console.log('Seeding development data...');
  const connection = await pool.getConnection();

  try {
    // Insert default shifts
    await connection.query(`
      INSERT IGNORE INTO shifts (id, name, start_time, end_time, grace_minutes, min_full_day_minutes, half_day_minutes, weekly_off_days) VALUES
      (1, 'General Shift A', '10:00:00', '19:00:00', 15, 480, 240, '[0, 6]'),
      (2, 'General Shift B', '11:00:00', '20:00:00', 15, 480, 240, '[0, 6]')
    `);
    console.log('✓ shifts seeded');

    // Insert a sample office location
    await connection.query(`
      INSERT IGNORE INTO office_locations (id, name, address, latitude, longitude, radius_meters, max_accuracy_meters) VALUES
      (1, 'Digital to Infinity Office', 'Main Office', 28.6139391, 77.2090212, 100, 150)
    `);
    console.log('✓ office location seeded');

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
