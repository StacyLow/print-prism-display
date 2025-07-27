-- Clean up duplicate filament types in the database
-- Remove duplicates like "PLA;PLA;PLA" and keep only the first type
UPDATE print_jobs 
SET filament_type = TRIM(SPLIT_PART(filament_type, ';', 1))
WHERE filament_type LIKE '%;%' AND filament_type IS NOT NULL;