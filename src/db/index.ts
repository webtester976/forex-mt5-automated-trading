import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const config: PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    if (process.env.DATABASE_URL) {
      config.connectionString = process.env.DATABASE_URL;
    } else if (process.env.INSTANCE_CONNECTION_NAME) {
      config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
      config.user = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
      config.password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    } else {
      config.host = process.env.SQL_HOST;
      config.user = process.env.SQL_USER;
      config.password = process.env.SQL_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    }

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });
export default db;
