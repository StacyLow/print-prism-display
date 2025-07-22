-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Users can create their own print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Users can update their own print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Users can delete their own print jobs" ON public.print_jobs;

-- Remove the user_id column
ALTER TABLE public.print_jobs DROP COLUMN IF EXISTS user_id;

-- Create public access RLS policies
CREATE POLICY "Allow public read access to print jobs" 
ON public.print_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to print jobs" 
ON public.print_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to print jobs" 
ON public.print_jobs 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to print jobs" 
ON public.print_jobs 
FOR DELETE 
USING (true);