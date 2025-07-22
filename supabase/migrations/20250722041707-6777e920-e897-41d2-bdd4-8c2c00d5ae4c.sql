-- Create metrics cache table for pre-computed aggregations
CREATE TABLE metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- e.g., "daily_2024-01-15_PLA_Bumblebee"
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

-- Add indexes for performance on print_jobs table
CREATE INDEX IF NOT EXISTS idx_print_jobs_start_date ON print_jobs(print_start);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_name);
CREATE INDEX IF NOT EXISTS idx_print_jobs_filament ON print_jobs(filament_type);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

-- Add index for metrics cache
CREATE INDEX idx_metrics_cache_key ON metrics_cache(cache_key);
CREATE INDEX idx_metrics_cache_dates ON metrics_cache(date_start, date_end);

-- Function to update metrics cache when new jobs are added
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

-- Create trigger to automatically update cache
CREATE TRIGGER trigger_update_metrics_cache
  AFTER INSERT OR UPDATE ON print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics_cache();

-- Enable RLS on metrics_cache
ALTER TABLE metrics_cache ENABLE ROW LEVEL SECURITY;

-- Allow public access to metrics cache (same as print_jobs)
CREATE POLICY "Allow public read access to metrics cache" 
ON metrics_cache FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to metrics cache" 
ON metrics_cache FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to metrics cache" 
ON metrics_cache FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to metrics cache" 
ON metrics_cache FOR DELETE 
USING (true);