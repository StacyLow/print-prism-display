import { supabase } from '@/integrations/supabase/client';
import { createPostgresClient } from './postgres';
import { DatabaseConfig } from '@/types/database';

// Database abstraction layer
export class DatabaseClient {
  private config: DatabaseConfig;
  private supabaseClient?: typeof supabase;
  private postgresClient?: ReturnType<typeof createPostgresClient>;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    if (config.type === 'supabase' && config.supabase?.url && config.supabase?.anonKey) {
      this.supabaseClient = supabase;
    } else if (config.type === 'postgres' && config.postgres) {
      this.postgresClient = createPostgresClient(config.postgres);
    }
  }

  // Test database connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.type === 'supabase' && this.supabaseClient) {
        // Test Supabase connection by querying a simple table or using auth
        const { data, error } = await this.supabaseClient.from('print_jobs').select('id').limit(1);
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } else if (this.config.type === 'postgres' && this.postgresClient) {
        const success = await this.postgresClient.testConnection();
        return { success, error: success ? undefined : 'PostgreSQL connection failed' };
      }
      return { success: false, error: 'No valid database configuration' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get the appropriate client for data operations
  getClient() {
    if (this.config.type === 'supabase' && this.supabaseClient) {
      return this.supabaseClient;
    } else if (this.config.type === 'postgres' && this.postgresClient) {
      return this.postgresClient;
    }
    throw new Error('No valid database client available');
  }

  isConfigured(): boolean {
    if (this.config.type === 'supabase') {
      return !!(this.config.supabase?.url && this.config.supabase?.anonKey);
    }
    if (this.config.type === 'postgres') {
      return !!(this.config.postgres?.host && this.config.postgres?.database);
    }
    return false;
  }
}

// Create database client from config
export const createDatabaseClient = (config: DatabaseConfig) => {
  return new DatabaseClient(config);
};