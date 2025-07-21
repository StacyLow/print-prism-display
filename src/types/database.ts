
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
}

export interface DatabaseConnectionStatus {
  isConnected: boolean;
  lastTested?: Date;
  error?: string;
}

export const defaultDatabaseConfig: DatabaseConfig = {
  host: '127.0.0.1', // Use IPv4 explicitly to avoid ::1 issues
  port: 5432,
  database: '',
  username: '',
  password: '',
  ssl: false,
  connectionTimeout: 30,
};
