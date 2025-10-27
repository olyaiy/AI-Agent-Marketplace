import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';
import { config } from 'dotenv';


function loadEnvFile(path: string): void {
  try {
    config({ path });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Better Auth] Failed to load env file at ${path}:`, error);
    }
  }
}

if (typeof window === 'undefined') {
  loadEnvFile('.env');
  loadEnvFile('.env.local');
}

interface EnvConfig {
  databaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
}

function loadEnv(): EnvConfig {
  const { DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined.');
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not defined.');
  }

  if (!GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not defined.');
  }

  return {
    databaseUrl: DATABASE_URL,
    googleClientId: GOOGLE_CLIENT_ID,
    googleClientSecret: GOOGLE_CLIENT_SECRET,
  };
}

const globalScope = globalThis as unknown as {
  __betterAuthPool?: Pool;
};

function resolvePool(connectionString: string): Pool {
  if (globalScope.__betterAuthPool) {
    return globalScope.__betterAuthPool;
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  globalScope.__betterAuthPool = pool;
  return pool;
}

const env = loadEnv();
const pool = resolvePool(env.databaseUrl);

export const auth = betterAuth({
  database: pool,
  trustedOrigins: [
    'http://localhost:3000',
    'https://agentvendor.netlify.app',
    'https://agentvendor.ca',
  ],
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      accessType: 'offline',
      prompt: 'select_account consent',
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
});

