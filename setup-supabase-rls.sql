-- Supabase Row Level Security (RLS) Setup
-- Run this script in your Supabase SQL editor after setting up the main database

-- Enable Row Level Security on tables
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for print_jobs table (public access for dashboard use)
-- Note: These policies allow public access. Modify based on your security requirements.

CREATE POLICY "Allow public read access to print jobs" 
ON print_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to print jobs" 
ON print_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to print jobs" 
ON print_jobs 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to print jobs" 
ON print_jobs 
FOR DELETE 
USING (true);

-- Create policies for metrics_cache table
CREATE POLICY "Allow public read access to metrics cache" 
ON metrics_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to metrics cache" 
ON metrics_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to metrics cache" 
ON metrics_cache 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to metrics cache" 
ON metrics_cache 
FOR DELETE 
USING (true);

-- Optional: If you want to restrict access to authenticated users only, 
-- replace 'true' with 'auth.role() = 'authenticated'' in the policies above

-- Example of user-specific access (if you plan to add user authentication later):
-- 
-- CREATE POLICY "Users can view their own print jobs" 
-- ON print_jobs 
-- FOR SELECT 
-- USING (auth.uid() = user_id);
-- 
-- Note: You would need to add a user_id column to the tables first:
-- ALTER TABLE print_jobs ADD COLUMN user_id UUID REFERENCES auth.users(id);