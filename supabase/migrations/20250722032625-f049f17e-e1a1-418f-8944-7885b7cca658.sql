-- Add user_id column to print_jobs table
ALTER TABLE public.print_jobs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have a user_id (if any exist)
-- This sets all existing records to NULL, you may want to assign them to a specific user
-- UPDATE public.print_jobs SET user_id = 'some-user-id' WHERE user_id IS NULL;

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.print_jobs;

-- Create comprehensive RLS policies for print_jobs
CREATE POLICY "Users can view their own print jobs" 
ON public.print_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own print jobs" 
ON public.print_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own print jobs" 
ON public.print_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own print jobs" 
ON public.print_jobs 
FOR DELETE 
USING (auth.uid() = user_id);