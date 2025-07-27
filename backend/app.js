const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:80'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-DB-Config']
}));

app.use(express.json());

// Database connection utility
function createDbConnection(config) {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Test database connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.host || !config.database || !config.username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required database configuration' 
      });
    }

    const pool = createDbConnection(config);
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: `Connection failed: ${error.message}` 
    });
  }
});

// Get print jobs with filtering
app.get('/api/print-jobs', async (req, res) => {
  try {
    const dbConfigHeader = req.headers['x-db-config'];
    if (!dbConfigHeader) {
      return res.status(400).json({ error: 'Database configuration required' });
    }

    const config = JSON.parse(dbConfigHeader);
    const pool = createDbConnection(config);
    
    let query = 'SELECT * FROM print_jobs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (req.query.printer_name) {
      query += ` AND printer_name = $${paramIndex}`;
      params.push(req.query.printer_name);
      paramIndex++;
    }

    if (req.query.filament_type) {
      query += ` AND filament_type = $${paramIndex}`;
      params.push(req.query.filament_type);
      paramIndex++;
    }

    if (req.query.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(req.query.status);
      paramIndex++;
    }

    if (req.query.start_date) {
      query += ` AND print_start >= $${paramIndex}`;
      params.push(parseFloat(req.query.start_date));
      paramIndex++;
    }

    if (req.query.end_date) {
      query += ` AND print_start <= $${paramIndex}`;
      params.push(parseFloat(req.query.end_date));
      paramIndex++;
    }

    query += ' ORDER BY print_start DESC';

    if (req.query.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(req.query.limit));
    }

    const result = await pool.query(query, params);
    await pool.end();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching print jobs:', error);
    res.status(500).json({ error: `Failed to fetch print jobs: ${error.message}` });
  }
});

// Get metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const dbConfigHeader = req.headers['x-db-config'];
    if (!dbConfigHeader) {
      return res.status(400).json({ error: 'Database configuration required' });
    }

    const config = JSON.parse(dbConfigHeader);
    const pool = createDbConnection(config);
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (req.query.printer_name) {
      whereClause += ` AND printer_name = $${paramIndex}`;
      params.push(req.query.printer_name);
      paramIndex++;
    }

    if (req.query.filament_type) {
      whereClause += ` AND filament_type = $${paramIndex}`;
      params.push(req.query.filament_type);
      paramIndex++;
    }

    if (req.query.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(req.query.status);
      paramIndex++;
    }

    if (req.query.start_date) {
      whereClause += ` AND print_start >= $${paramIndex}`;
      params.push(parseFloat(req.query.start_date));
      paramIndex++;
    }

    if (req.query.end_date) {
      whereClause += ` AND print_start <= $${paramIndex}`;
      params.push(parseFloat(req.query.end_date));
      paramIndex++;
    }

    // Get aggregated metrics
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_jobs,
        COALESCE(SUM(total_duration), 0) as total_print_time_seconds,
        COALESCE(SUM(filament_total), 0) as total_filament_length_mm,
        COALESCE(SUM(filament_weight), 0) as total_filament_weight_g,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status IN ('cancelled', 'interrupted', 'server_exit', 'klippy_shutdown') THEN 1 END) as failed_jobs
      FROM print_jobs 
      WHERE ${whereClause}
    `;

    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM print_jobs 
      WHERE ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const filamentQuery = `
      SELECT 
        filament_type,
        COUNT(*) as count,
        COALESCE(SUM(filament_total), 0) as total_length,
        COALESCE(SUM(filament_weight), 0) as total_weight
      FROM print_jobs 
      WHERE ${whereClause} AND filament_type IS NOT NULL
      GROUP BY filament_type
      ORDER BY count DESC
    `;

    const [metricsResult, statusResult, filamentResult] = await Promise.all([
      pool.query(metricsQuery, params),
      pool.query(statusQuery, params),
      pool.query(filamentQuery, params)
    ]);

    const metrics = metricsResult.rows[0];
    const totalJobs = parseInt(metrics.total_jobs) || 0;
    const completedJobs = parseInt(metrics.completed_jobs) || 0;
    const failedJobs = parseInt(metrics.failed_jobs) || 0;

    const response = {
      total_jobs: totalJobs,
      total_print_time: Math.round((parseFloat(metrics.total_print_time_seconds) || 0) / 60), // Convert to minutes
      total_filament_length: Math.round((parseFloat(metrics.total_filament_length_mm) || 0) / 1000), // Convert to meters
      total_filament_weight: Math.round(parseFloat(metrics.total_filament_weight_g) || 0),
      success_rate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
      completed_jobs: completedJobs,
      failed_jobs: failedJobs,
      status_breakdown: statusResult.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      })),
      filament_usage: filamentResult.rows.map(row => ({
        filament_type: row.filament_type,
        count: parseInt(row.count),
        total_length: Math.round((parseFloat(row.total_length) || 0) / 1000), // Convert to meters
        total_weight: Math.round(parseFloat(row.total_weight) || 0)
      })),
      most_used_filament: filamentResult.rows.length > 0 ? filamentResult.rows[0].filament_type : 'N/A'
    };

    await pool.end();
    res.json(response);
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: `Failed to calculate metrics: ${error.message}` });
  }
});

// Get filament types
app.get('/api/filament-types', async (req, res) => {
  try {
    const dbConfigHeader = req.headers['x-db-config'];
    if (!dbConfigHeader) {
      return res.status(400).json({ error: 'Database configuration required' });
    }

    const config = JSON.parse(dbConfigHeader);
    const pool = createDbConnection(config);
    
    const query = `
      SELECT DISTINCT filament_type 
      FROM print_jobs 
      WHERE filament_type IS NOT NULL AND filament_type != ''
      ORDER BY filament_type
    `;
    
    const result = await pool.query(query);
    await pool.end();
    
    const filamentTypes = result.rows.map(row => row.filament_type);
    res.json(filamentTypes);
  } catch (error) {
    console.error('Error fetching filament types:', error);
    res.status(500).json({ error: `Failed to fetch filament types: ${error.message}` });
  }
});

// Get printers
app.get('/api/printers', async (req, res) => {
  try {
    const dbConfigHeader = req.headers['x-db-config'];
    if (!dbConfigHeader) {
      return res.status(400).json({ error: 'Database configuration required' });
    }

    const config = JSON.parse(dbConfigHeader);
    const pool = createDbConnection(config);
    
    const query = `
      SELECT DISTINCT printer_name 
      FROM print_jobs 
      WHERE printer_name IS NOT NULL AND printer_name != ''
      ORDER BY printer_name
    `;
    
    const result = await pool.query(query);
    await pool.end();
    
    const printers = result.rows.map(row => ({
      name: row.printer_name,
      emoji: '🖨️'
    }));
    
    res.json(printers);
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ error: `Failed to fetch printers: ${error.message}` });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});