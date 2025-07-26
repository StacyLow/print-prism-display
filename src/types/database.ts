export type DatabaseType = 'supabase' | 'postgres';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface DatabaseConfig {
  type: DatabaseType;
  supabase?: SupabaseConfig;
  postgres?: PostgresConfig;
}

export const EMPTY_DATABASE_CONFIG: DatabaseConfig = {
  type: 'supabase',
  supabase: {
    url: '',
    anonKey: ''
  },
  postgres: {
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false
  }
};