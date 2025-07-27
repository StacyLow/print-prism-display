# Printer Dashboard

A modern web application for monitoring and analyzing 3D printing job data with beautiful charts and analytics.

## Features

- **Real-time Dashboard**: Monitor print jobs, filament usage, and printer performance
- **Analytics**: Detailed charts for print time, filament consumption, and success rates
- **Multi-Printer Support**: Track multiple printers and their individual statistics
- **Filament Tracking**: Monitor different filament types and their usage patterns
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Configurable Database**: Supports both Supabase and PostgreSQL connections

## Quick Start

### Option 1: Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [Supabase](https://supabase.com) and create a new project
   - Wait for the project to be fully provisioned

2. **Set Up the Database Schema**
   - In your Supabase dashboard, go to SQL Editor
   - Copy and paste the contents of `setup-database.sql` and run it
   - Copy and paste the contents of `setup-supabase-rls.sql` and run it

3. **Configure the Application**
   - Clone this repository and install dependencies:
     ```bash
     git clone <YOUR_GIT_URL>
     cd <YOUR_PROJECT_NAME>
     npm install
     npm run dev
     ```
   - Open the application and go to Settings
   - Enter your Supabase Project URL and Anonymous Key (found in Project Settings → API)
   - Test the connection and save

### Option 2: Direct PostgreSQL

1. **Set Up PostgreSQL Database**
   ```bash
   # Create database (if it doesn't exist)
   createdb printer_dashboard
   
   # Connect to your PostgreSQL database
   psql -h your-host -U your-username -d your-database
   
   # Or connect to local PostgreSQL
   psql -U postgres -d printer_dashboard
   ```

2. **Create Database Schema**
   
   **Option A: Using the setup script**
   ```bash
   psql -h your-host -U your-username -d your-database -f setup-database.sql
   ```
   
   **Option B: Manual SQL execution**
   
   Connect to your database and run the following SQL commands:
   
   ```sql
   -- Create print_jobs table
   CREATE TABLE IF NOT EXISTS print_jobs (
       id BIGSERIAL PRIMARY KEY,
       filename TEXT DEFAULT '',
       status TEXT DEFAULT '',
       printer_name TEXT,
       filament_type TEXT,
       print_start DOUBLE PRECISION,
       print_end DOUBLE PRECISION,
       total_duration DOUBLE PRECISION,
       filament_total DOUBLE PRECISION,
       filament_weight DOUBLE PRECISION
   );

   -- Create metrics_cache table for performance optimization
   CREATE TABLE IF NOT EXISTS metrics_cache (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       cache_key TEXT NOT NULL UNIQUE,
       date_start TIMESTAMP WITH TIME ZONE,
       date_end TIMESTAMP WITH TIME ZONE,
       printer_name TEXT,
       filament_type TEXT,
       total_print_time DOUBLE PRECISION DEFAULT 0,
       total_filament_length DOUBLE PRECISION DEFAULT 0,
       total_filament_weight DOUBLE PRECISION DEFAULT 0,
       job_count INTEGER DEFAULT 0,
       completed_jobs INTEGER DEFAULT 0,
       failed_jobs INTEGER DEFAULT 0,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create function to update metrics cache
   CREATE OR REPLACE FUNCTION update_metrics_cache()
   RETURNS TRIGGER AS $$
   DECLARE
     cache_key_daily TEXT;
     cache_key_overall TEXT;
     job_date DATE;
   BEGIN
     -- Handle INSERT and UPDATE
     IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
       job_date := DATE(to_timestamp(NEW.print_start));
       
       -- Daily cache key
       cache_key_daily := 'daily_' || job_date || '_' || COALESCE(NEW.filament_type, 'unknown') || '_' || COALESCE(NEW.printer_name, 'unknown');
       
       -- Overall cache key
       cache_key_overall := 'overall_' || COALESCE(NEW.filament_type, 'unknown') || '_' || COALESCE(NEW.printer_name, 'unknown');
       
       -- Update or insert daily cache entry
       INSERT INTO metrics_cache (
         cache_key, date_start, date_end, printer_name, filament_type,
         total_print_time, total_filament_length, total_filament_weight,
         job_count, completed_jobs, failed_jobs
       )
       SELECT 
         cache_key_daily,
         job_date::timestamp,
         (job_date + interval '1 day')::timestamp,
         NEW.printer_name,
         NEW.filament_type,
         SUM(COALESCE(total_duration, 0)) / 60.0, -- Convert seconds to minutes
         SUM(COALESCE(filament_total, 0)) / 1000.0, -- Convert mm to meters
         SUM(COALESCE(filament_weight, 0)),
         COUNT(*),
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),
         SUM(CASE WHEN status IN ('cancelled', 'interrupted', 'server_exit', 'klippy_shutdown') THEN 1 ELSE 0 END)
       FROM print_jobs 
       WHERE DATE(to_timestamp(print_start)) = job_date
         AND COALESCE(filament_type, 'unknown') = COALESCE(NEW.filament_type, 'unknown')
         AND COALESCE(printer_name, 'unknown') = COALESCE(NEW.printer_name, 'unknown')
       ON CONFLICT (cache_key) 
       DO UPDATE SET
         total_print_time = EXCLUDED.total_print_time,
         total_filament_length = EXCLUDED.total_filament_length,
         total_filament_weight = EXCLUDED.total_filament_weight,
         job_count = EXCLUDED.job_count,
         completed_jobs = EXCLUDED.completed_jobs,
         failed_jobs = EXCLUDED.failed_jobs,
         updated_at = NOW();
         
       -- Update overall cache entry
       INSERT INTO metrics_cache (
         cache_key, printer_name, filament_type,
         total_print_time, total_filament_length, total_filament_weight,
         job_count, completed_jobs, failed_jobs
       )
       SELECT 
         cache_key_overall,
         NEW.printer_name,
         NEW.filament_type,
         SUM(COALESCE(total_duration, 0)) / 60.0,
         SUM(COALESCE(filament_total, 0)) / 1000.0,
         SUM(COALESCE(filament_weight, 0)),
         COUNT(*),
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),
         SUM(CASE WHEN status IN ('cancelled', 'interrupted', 'server_exit', 'klippy_shutdown') THEN 1 ELSE 0 END)
       FROM print_jobs 
       WHERE COALESCE(filament_type, 'unknown') = COALESCE(NEW.filament_type, 'unknown')
         AND COALESCE(printer_name, 'unknown') = COALESCE(NEW.printer_name, 'unknown')
       ON CONFLICT (cache_key) 
       DO UPDATE SET
         total_print_time = EXCLUDED.total_print_time,
         total_filament_length = EXCLUDED.total_filament_length,
         total_filament_weight = EXCLUDED.total_filament_weight,
         job_count = EXCLUDED.job_count,
         completed_jobs = EXCLUDED.completed_jobs,
         failed_jobs = EXCLUDED.failed_jobs,
         updated_at = NOW();
     END IF;
     
     RETURN COALESCE(NEW, OLD);
   END;
   $$ LANGUAGE plpgsql;

   -- Create trigger for automatic cache updates
   DROP TRIGGER IF EXISTS trigger_update_metrics_cache ON print_jobs;
   CREATE TRIGGER trigger_update_metrics_cache
       AFTER INSERT OR UPDATE ON print_jobs
       FOR EACH ROW
       EXECUTE FUNCTION update_metrics_cache();

   -- Create indexes for better performance
   CREATE INDEX IF NOT EXISTS idx_print_jobs_printer_name ON print_jobs(printer_name);
   CREATE INDEX IF NOT EXISTS idx_print_jobs_filament_type ON print_jobs(filament_type);
   CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
   CREATE INDEX IF NOT EXISTS idx_print_jobs_print_start ON print_jobs(print_start);
   CREATE INDEX IF NOT EXISTS idx_metrics_cache_cache_key ON metrics_cache(cache_key);
   CREATE INDEX IF NOT EXISTS idx_metrics_cache_printer_filament ON metrics_cache(printer_name, filament_type);
   ```

3. **Insert Sample Data (Optional)**
   ```sql
   INSERT INTO print_jobs (filename, status, printer_name, filament_type, print_start, print_end, total_duration, filament_total, filament_weight)
   VALUES 
   ('test_print.gcode', 'completed', 'Printer_1', 'PLA', 1673456789, 1673467890, 11101, 45000, 125.5),
   ('large_model.gcode', 'completed', 'Printer_2', 'PETG', 1673567890, 1673589012, 21122, 89000, 267.8),
   ('small_part.gcode', 'failed', 'Printer_1', 'ABS', 1673678901, 1673689001, 10100, 25000, 75.2);
   ```

4. **Configure the Application**
   - Clone this repository and install dependencies:
     ```bash
     git clone <YOUR_GIT_URL>
     cd <YOUR_PROJECT_NAME>
     npm install
     npm run dev
     ```
   - Open the application and go to Settings
   - Select "PostgreSQL" as database type
   - Enter your PostgreSQL connection details:
     - **Host**: Your PostgreSQL server host
     - **Port**: Usually 5432
     - **Database**: Your database name (e.g., printer_dashboard)
     - **Username**: Your PostgreSQL username
     - **Password**: Your PostgreSQL password
     - **SSL**: Enable if your server requires SSL
   - Test the connection and save

## PostgreSQL Troubleshooting

### Connection Issues
- **Authentication failed**: Verify username/password are correct
- **Connection refused**: Ensure PostgreSQL is running and accessible
- **SSL required**: Enable SSL in connection settings if required by server
- **Database doesn't exist**: Create the database first with `createdb printer_dashboard`

### Permission Issues
```sql
-- If you get permission errors, grant necessary privileges:
GRANT ALL PRIVILEGES ON DATABASE printer_dashboard TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### Schema Issues
- **Table doesn't exist**: Make sure you ran all the CREATE TABLE commands
- **Trigger not working**: Verify the trigger function was created successfully
- **No metrics showing**: Check that the metrics_cache table exists and trigger is active

### Bulk Data Import
For importing large amounts of historical data:

```bash
# From CSV file
psql -d printer_dashboard -c "\COPY print_jobs(filename,status,printer_name,filament_type,print_start,print_end,total_duration,filament_total,filament_weight) FROM 'your_data.csv' CSV HEADER"

# From SQL dump
psql -d printer_dashboard -f your_data_dump.sql
```

## Supabase Setup Guide

### 1. Create a Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in or create an account
4. Click "New Project"
5. Choose your organization
6. Enter a project name and database password
7. Select a region close to your users
8. Click "Create new project"

### 2. Set Up Database Tables

1. Navigate to the SQL Editor in your Supabase dashboard
2. Create a new query
3. Copy the entire contents of `setup-database.sql` from this repository
4. Paste it into the SQL editor and click "Run"
5. This will create:
   - `print_jobs` table for storing print job data
   - `metrics_cache` table for performance optimization
   - Necessary functions and triggers
   - Database indexes for optimal performance

### 3. Configure Row Level Security (RLS)

1. In the SQL Editor, create another new query
2. Copy the entire contents of `setup-supabase-rls.sql`
3. Paste and run it to set up security policies

**Note**: The default setup allows public access to data. If you need user authentication and private data, modify the RLS policies accordingly.

### 4. Get Your API Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (looks like `https://your-project.supabase.co`)
   - **anon/public key** (long JWT token)

### 5. Configure the Application

1. Open the Printer Dashboard application
2. Navigate to Settings (gear icon)
3. Select "Supabase" as database type
4. Enter your Project URL and Anonymous Key
5. Click "Test Connection" to verify
6. Click "Save Configuration"

## Database Schema

The application requires two main tables:

### print_jobs
- `id`: Primary key (BIGSERIAL)
- `filename`: Name of the printed file
- `status`: Print job status (completed, failed, etc.)
- `printer_name`: Name/identifier of the printer
- `filament_type`: Type of filament used
- `print_start`: Unix timestamp of print start
- `print_end`: Unix timestamp of print completion
- `total_duration`: Total print time in seconds
- `filament_total`: Total filament used in mm
- `filament_weight`: Filament weight in grams

### metrics_cache
Performance optimization table that stores aggregated metrics:
- Daily and overall statistics per printer/filament combination
- Automatically updated via database triggers
- Improves dashboard loading performance

## Data Import

To populate the dashboard with your print data, you can:

1. **Manual Entry**: Use the Supabase dashboard to manually insert records
2. **API Integration**: Connect your printer management software to insert data via Supabase API
3. **CSV Import**: Use Supabase's import functionality to bulk-load historical data

### Sample Data Format

```sql
INSERT INTO print_jobs (filename, status, printer_name, filament_type, print_start, print_end, total_duration, filament_total, filament_weight)
VALUES 
('test_print.gcode', 'completed', 'Printer_1', 'PLA', 1673456789, 1673467890, 11101, 45000, 125.5),
('large_model.gcode', 'completed', 'Printer_2', 'PETG', 1673567890, 1673589012, 21122, 89000, 267.8);
```

## Development

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

## Deployment

### Using Docker

The application includes Docker configuration for easy deployment:

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Using Portainer

See `DEPLOYMENT.md` for detailed Portainer deployment instructions.

### Lovable Platform

Simply open [Lovable](https://lovable.dev/projects/86ada419-09cd-4be3-b888-f655ea214b05) and click on Share → Publish.

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Hooks
- **Routing**: React Router

## Security Considerations

- The default setup uses public RLS policies for ease of setup
- For production use with sensitive data, implement proper user authentication
- Consider restricting database access to authenticated users only
- Review and customize RLS policies based on your security requirements

## Troubleshooting

### Cannot Connect to Database
- Verify your Supabase project URL and API key are correct
- Ensure your Supabase project is fully provisioned (not paused)
- Check that you've run both setup SQL scripts

### No Data Showing
- Verify you have data in the `print_jobs` table
- Check browser console for any JavaScript errors
- Ensure RLS policies allow read access to your data

### Performance Issues
- The `metrics_cache` table should automatically optimize performance
- For large datasets, consider adding additional database indexes
- Monitor Supabase usage and upgrade plan if needed

## Contributing

This project was created with [Lovable](https://lovable.dev). To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[MIT License](LICENSE) - feel free to use this project for your own 3D printing monitoring needs!
