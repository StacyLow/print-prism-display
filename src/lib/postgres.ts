import { PostgresConfig } from '@/types/database';

// PostgreSQL client that communicates with Flask backend API
export class PostgresClient {
  private config: PostgresConfig;
  private apiUrl: string;

  constructor(config: PostgresConfig) {
    this.config = config;
    // Use environment variable or fallback to proxy
    this.apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://192.168.1.139:5000';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-DB-Config': JSON.stringify(this.config),
      ...options.headers,
    };

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async select(table: string, columns = '*', filters?: Record<string, any>) {
    try {
      if (table === 'print_jobs') {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
        }
        
        const queryString = params.toString();
        const endpoint = `/print-jobs${queryString ? `?${queryString}` : ''}`;
        
        return await this.makeRequest(endpoint);
      }
      
      throw new Error(`Table ${table} not supported yet`);
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async insert(table: string, data: Record<string, any>) {
    throw new Error('Insert operations not implemented yet');
  }

  async update(table: string, data: Record<string, any>, filters?: Record<string, any>) {
    throw new Error('Update operations not implemented yet');
  }

  async delete(table: string, filters: Record<string, any>) {
    throw new Error('Delete operations not implemented yet');
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeRequest('/test-connection', {
        method: 'POST',
        body: JSON.stringify(this.config),
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // Custom methods for specific API endpoints
  async getMetrics(filters?: Record<string, any>) {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      
      const queryString = params.toString();
      const endpoint = `/metrics${queryString ? `?${queryString}` : ''}`;
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get metrics');
    }
  }

  async getFilamentTypes() {
    try {
      return await this.makeRequest('/filament-types');
    } catch (error) {
      return [];
    }
  }

  async getPrinters() {
    try {
      return await this.makeRequest('/printers');
    } catch (error) {
      return [];
    }
  }
}

export const createPostgresClient = (config: PostgresConfig) => {
  return new PostgresClient(config);
};
