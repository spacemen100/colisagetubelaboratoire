import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create a postgres client with the connection string from environment variables
const connectionString = process.env.DATABASE_URL;

// For the conection pooling we use different settings for production and development
const client = postgres(connectionString!, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Time in seconds after which an idle client is closed
  prepare: false, // Disable prepared statements for better compatibility
});

// Create a drizzle instance with the client and schema
export const db = drizzle(client, { schema });