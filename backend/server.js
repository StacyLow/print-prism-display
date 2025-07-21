
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
    const testPool = createPool(config);
    
    await testPool.query('SELECT 1');
    await testPool.end();
    
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
    
    if (!pool) {
      pool = createPool(config);
    }
    
    const result = await pool.query(query, params);
    
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
    
    if (!pool) {
      pool = createPool(config);
    }
    
    const result = await pool.query('SELECT DISTINCT filament_type FROM print_jobs ORDER BY filament_type');
    const types = result.rows.map(row => row.filament_type);
    
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
    
    if (!pool) {
      pool = createPool(config);
    }
    
    const result = await pool.query('SELECT DISTINCT printer_name FROM print_jobs ORDER BY printer_name');
    const printers = result.rows.map(row => row.printer_name);
    
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
