import postgres from 'postgres';
import { PostgresConfig } from '@/types/database';

export class PostgresClient {
  private config: PostgresConfig;
  private sql: ReturnType<typeof postgres> | null = null;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  private getConnection() {
    if (!this.sql) {
      this.sql = postgres({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        username: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        max: 10,
        idle_timeout: 20,
        connect_timeout: 30,
      });
    }
    return this.sql;
  }

  // Select data from table
  async select(table: string, columns = '*', filters?: Record<string, any>) {
    try {
      const sql = this.getConnection();
      let query = `SELECT ${columns} FROM ${table}`;
      const values: any[] = [];
      
      if (filters) {
        const conditions = Object.keys(filters).map((key, index) => {
          values.push(filters[key]);
          return `${key} = $${index + 1}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const result = await sql.unsafe(query, values);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Insert data into table
  async insert(table: string, data: Record<string, any>) {
    try {
      const sql = this.getConnection();
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await sql.unsafe(query, values);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update data in table
  async update(table: string, data: Record<string, any>, filters?: Record<string, any>) {
    try {
      const sql = this.getConnection();
      const setColumns = Object.keys(data);
      const setValues = Object.values(data);
      let valueIndex = 1;
      
      const setClause = setColumns.map(col => `${col} = $${valueIndex++}`).join(', ');
      let query = `UPDATE ${table} SET ${setClause}`;
      const allValues = [...setValues];
      
      if (filters) {
        const conditions = Object.keys(filters).map(key => {
          allValues.push(filters[key]);
          return `${key} = $${valueIndex++}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
      const result = await sql.unsafe(query, allValues);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete data from table
  async delete(table: string, filters: Record<string, any>) {
    try {
      const sql = this.getConnection();
      const conditions = Object.keys(filters);
      const values = Object.values(filters);
      
      const whereClause = conditions.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
      
      const result = await sql.unsafe(query, values);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const sql = this.getConnection();
      await sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }

  // Close connection
  async close() {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
    }
  }
}

export const createPostgresClient = (config: PostgresConfig) => {
  return new PostgresClient(config);
};