-- Fix the security issue by setting search_path on the function
CREATE OR REPLACE FUNCTION public.update_metrics_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
    INSERT INTO public.metrics_cache (
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
    FROM public.print_jobs 
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
    INSERT INTO public.metrics_cache (
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
    FROM public.print_jobs 
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
$function$;