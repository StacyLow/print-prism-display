
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware to ensure JSON responses
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// PostgreSQL connection pool
let pool = null;

const createPool = (config) => {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: config.connectionTimeout * 1000,
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const { config } = req.body;
    console.log('Testing connection with config:', { ...config, password: '***' });
    
    if (!config || !config.host || !config.database || !config.username || !config.password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required database configuration fields' 
      });
    }
    
    const testPool = createPool(config);
    
    await testPool.query('SELECT 1');
    await testPool.end();
    
    console.log('Database connection test successful');
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fetch print jobs with filters
app.post('/api/print-jobs', async (req, res) => {
  try {
    const { config, query, params } = req.body;
    console.log('Fetching print jobs with query:', query);
    console.log('Query params:', params);
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Database configuration is required'
      });
    }
    
    if (!pool) {
      console.log('Creating new database pool...');
      pool = createPool(config);
    }
    
    const result = await pool.query(query, params);
    console.log(`Query executed successfully, returned ${result.rowCount} rows`);
    
    res.json({
      success: true,
      rows: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fetch available filament types
app.post('/api/filament-types', async (req, res) => {
  try {
    const { config } = req.body;
    console.log('Fetching filament types...');
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Database configuration is required'
      });
    }
    
    if (!pool) {
      console.log('Creating new database pool...');
      pool = createPool(config);
    }
    
    const result = await pool.query('SELECT DISTINCT filament_type FROM print_jobs ORDER BY filament_type');
    const types = result.rows.map(row => row.filament_type);
    console.log('Filament types fetched:', types);
    
    res.json({
      success: true,
      types: types
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fetch available printers
app.post('/api/printers', async (req, res) => {
  try {
    const { config } = req.body;
    console.log('Fetching printers...');
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Database configuration is required'
      });
    }
    
    if (!pool) {
      console.log('Creating new database pool...');
      pool = createPool(config);
    }
    
    const result = await pool.query('SELECT DISTINCT printer_name FROM print_jobs ORDER BY printer_name');
    const printers = result.rows.map(row => row.printer_name);
    console.log('Printers fetched:', printers);
    
    res.json({
      success: true,
      printers: printers
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.path}`
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Backend API server running on port ${port}`);
});
