import { PostgresConfig } from '@/types/database';

// PostgreSQL client that communicates with Flask backend API
export class PostgresClient {
  private config: PostgresConfig;
  private apiUrl: string;

  constructor(config: PostgresConfig) {
    this.config = config;
    // In development, use the Vite proxy. In production, use the environment variable
    this.apiUrl = import.meta.env.VITE_BACKEND_API_URL || '';
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
              if (Array.isArray(value)) {
                // Handle arrays by sending as comma-separated values
                params.append(key, value.join(','));
              } else {
                params.append(key, String(value));
              }
            }
          });
        }
        
        const queryString = params.toString();
        const endpoint = `/api/print-jobs${queryString ? `?${queryString}` : ''}`;
        
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
      const result = await this.makeRequest('/api/test-connection', {
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
            if (Array.isArray(value)) {
              // Handle arrays by sending as comma-separated values
              params.append(key, value.join(','));
            } else {
              params.append(key, String(value));
            }
          }
        });
      }
      
      const queryString = params.toString();
      const endpoint = `/api/metrics${queryString ? `?${queryString}` : ''}`;
      
      const result = await this.makeRequest(endpoint);
      
      // Transform snake_case to camelCase to match frontend interface
      return {
        totalPrintTime: result.total_print_time || 0,
        totalFilamentLength: result.total_filament_length || 0,
        totalFilamentWeight: result.total_filament_weight || 0,
        successRate: result.success_rate || 0,
        totalJobs: result.total_jobs || 0,
        avgPrintTime: result.total_jobs > 0 ? (result.total_print_time || 0) / result.total_jobs : 0,
        statusBreakdown: {
          completed: result.completed_jobs || 0,
          cancelled: result.status_breakdown?.find((s: any) => s.status === 'cancelled')?.count || 0,
          interrupted: result.status_breakdown?.find((s: any) => s.status === 'interrupted')?.count || 0,
          server_exit: result.status_breakdown?.find((s: any) => s.status === 'server_exit')?.count || 0,
          klippy_shutdown: result.status_breakdown?.find((s: any) => s.status === 'klippy_shutdown')?.count || 0,
          in_progress: result.status_breakdown?.find((s: any) => s.status === 'in_progress')?.count || 0
        },
        mostUsedFilament: {
          type: result.most_used_filament || 'N/A',
          count: result.filament_usage?.[0]?.count || 0,
          percentage: result.total_jobs > 0 && result.filament_usage?.[0]?.count 
            ? Math.round((result.filament_usage[0].count / result.total_jobs * 100) * 10) / 10 
            : 0
        }
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get metrics');
    }
  }

  async getFilamentTypes() {
    try {
      return await this.makeRequest('/api/filament-types');
    } catch (error) {
      return [];
    }
  }

  async getPrinters() {
    try {
      return await this.makeRequest('/api/printers');
    } catch (error) {
      return [];
    }
  }
}

export const createPostgresClient = (config: PostgresConfig) => {
  return new PostgresClient(config);
};