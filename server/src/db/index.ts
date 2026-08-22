import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '../config/index.js';
import * as schema from './schema.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.poolMax,
  queueLimit: 0,
  timezone: '+05:30',
});

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool };
