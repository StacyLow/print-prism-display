import { PostgresConfig } from '@/types/database';

// PostgreSQL direct connections are not supported in browser environments
// This is a placeholder implementation that shows appropriate error messages

export class PostgresClient {
  private config: PostgresConfig;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  // All methods throw errors explaining browser limitations
  async select(table: string, columns = '*', filters?: Record<string, any>) {
    throw new Error('Direct PostgreSQL connections are not supported in browser environments. Please use Supabase or deploy a backend API.');
  }

  async insert(table: string, data: Record<string, any>) {
    throw new Error('Direct PostgreSQL connections are not supported in browser environments. Please use Supabase or deploy a backend API.');
  }

  async update(table: string, data: Record<string, any>, filters?: Record<string, any>) {
    throw new Error('Direct PostgreSQL connections are not supported in browser environments. Please use Supabase or deploy a backend API.');
  }

  async delete(table: string, filters: Record<string, any>) {
    throw new Error('Direct PostgreSQL connections are not supported in browser environments. Please use Supabase or deploy a backend API.');
  }

  async testConnection(): Promise<boolean> {
    // Always returns false in browser environment
    return false;
  }
}

export const createPostgresClient = (config: PostgresConfig) => {
  return new PostgresClient(config);
};