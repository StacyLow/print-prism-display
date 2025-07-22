
import { useQuery } from '@tanstack/react-query';
import { PrintJob, MetricData, ChartData, FilterState, isSuccessfulStatus, isFailedStatus, isActiveStatus } from '@/types/printJob';
import { supabase } from '@/integrations/supabase/client';

// Helper function to get date range start based on actual data
const getDateRangeStart = async (range: FilterState['dateRange']): Promise<Date> => {
  if (range === 'ALL') {
    return new Date('2020-01-01');
  }
  
  try {
    // Get the latest date from the database to calculate relative ranges
    const { data: latestJob } = await supabase
      .from('print_jobs')
      .select('print_start')
      .order('print_start', { ascending: false })
      .limit(1)
      .single();

    const latestDate = latestJob ? new Date(latestJob.print_start * 1000) : new Date();
    
    switch (range) {
      case '1W': return new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M': return new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3M': return new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6M': return new Date(latestDate.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1Y': return new Date(latestDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  } catch (error) {
    console.error('Error getting latest job date:', error);
    // Fallback to current date-based ranges
    const now = new Date();
    switch (range) {
      case '1W': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3M': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6M': return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1Y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
};

// Function to get all real data from database
const getAllRealData = async (filters: FilterState): Promise<MetricData | null> => {
  try {
    console.log('🔍 getAllRealData called with filters:', filters);
    
    let query = supabase
      .from('print_jobs')
      .select(`
        total_duration,
        filament_total,
        filament_weight,
        status,
        print_start,
        id
      `);

    // CRITICAL: Only apply date filtering if NOT "ALL"
    if (filters.dateRange !== 'ALL') {
      const startDate = await getDateRangeStart(filters.dateRange);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      query = query.gte('print_start', startTimestamp);
      console.log(`📅 Applied date filter for ${filters.dateRange}. Start timestamp:`, startTimestamp);
    } else {
      console.log('🌍 NO DATE FILTER - Using ALL data from database');
    }

    // Apply other filters
    if (filters.filamentTypes.length > 0) {
      query = query.in('filament_type', filters.filamentTypes);
      console.log('🧵 Applied filament type filter:', filters.filamentTypes);
    }
    if (filters.printers.length > 0) {
      query = query.in('printer_name', filters.printers);
      console.log('🖨️ Applied printer filter:', filters.printers);
    }

    // CRITICAL: Remove ALL limits to get every single row
    console.log('🚀 Fetching ALL rows without limits...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data returned from database query');
      return null;
    }

    console.log(`✅ Successfully fetched ${data.length} rows from database`);

    // Use ALL jobs - no filtering by duration or anything else
    const allJobs = data;
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    const failedJobs = allJobs.filter(job => ['cancelled', 'interrupted', 'server_exit', 'klippy_shutdown'].includes(job.status || ''));
    const inProgressJobs = allJobs.filter(job => job.status === 'in_progress');
    const nonActiveJobs = allJobs.filter(job => job.status !== 'in_progress');

    console.log('📊 Job breakdown:');
    console.log(`   Total jobs: ${allJobs.length}`);
    console.log(`   Completed: ${completedJobs.length}`);
    console.log(`   Failed: ${failedJobs.length}`);
    console.log(`   In Progress: ${inProgressJobs.length}`);

    // Calculate totals using ALL jobs
    const totalPrintTime = allJobs.reduce((sum, job) => sum + ((job.total_duration || 0) / 60), 0); // Convert seconds to minutes
    const totalFilamentLength = allJobs.reduce((sum, job) => sum + ((job.filament_total || 0) / 1000), 0); // Convert mm to meters
    const totalFilamentWeight = allJobs.reduce((sum, job) => sum + (job.filament_weight || 0), 0); // Keep in grams

    console.log('🧮 Calculated totals:');
    console.log(`   Total Jobs: ${allJobs.length}`);
    console.log(`   Total Print Time: ${(totalPrintTime / 60).toFixed(1)} hours`);
    console.log(`   Total Filament Length: ${(totalFilamentLength / 1000).toFixed(1)} km`);
    console.log(`   Total Filament Weight: ${(totalFilamentWeight / 1000).toFixed(1)} kg`);

    const metrics: MetricData = {
      totalPrintTime,
      totalFilamentLength,
      totalFilamentWeight,
      successRate: nonActiveJobs.length > 0 ? (completedJobs.length / nonActiveJobs.length) * 100 : 0,
      totalJobs: allJobs.length,
      avgPrintTime: allJobs.length > 0 ? totalPrintTime / allJobs.length : 0,
      statusBreakdown: {
        completed: completedJobs.length,
        cancelled: failedJobs.filter(job => job.status === 'cancelled').length,
        interrupted: failedJobs.filter(job => job.status === 'interrupted').length,
        server_exit: failedJobs.filter(job => job.status === 'server_exit').length,
        klippy_shutdown: failedJobs.filter(job => job.status === 'klippy_shutdown').length,
        in_progress: inProgressJobs.length
      }
    };

    console.log('🎯 Final metrics object:', metrics);
    return metrics;
  } catch (error) {
    console.error('💥 Error in getAllRealData:', error);
    return null;
  }
};

// Simplified Print Job Data Fetching - ALWAYS use real data
export const usePrintJobs = (filters: FilterState) => {
  return useQuery({
    queryKey: ['printJobs', filters],
    queryFn: async () => {
      console.log('🔄 usePrintJobs: Fetching print jobs data');
      
      try {
        let query = supabase
          .from('print_jobs')
          .select('*')
          .order('print_start', { ascending: false });

        // Apply date filter only if not "ALL"
        if (filters.dateRange !== 'ALL') {
          const startDate = await getDateRangeStart(filters.dateRange);
          const startTimestamp = Math.floor(startDate.getTime() / 1000);
          query = query.gte('print_start', startTimestamp);
        }

        // Apply other filters
        if (filters.filamentTypes.length > 0) {
          query = query.in('filament_type', filters.filamentTypes);
        }
        if (filters.printers.length > 0) {
          query = query.in('printer_name', filters.printers);
        }

        // Remove limit for chart data when using "ALL" time
        if (filters.dateRange === 'ALL') {
          // No limit - get all data
        } else {
          query = query.limit(5000); // Reasonable limit for non-all time ranges
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ usePrintJobs: Supabase error:', error);
          throw error;
        }

        console.log(`✅ usePrintJobs: Fetched ${data?.length || 0} jobs for charts`);

        // Convert Supabase data to PrintJob format
        const convertedData: PrintJob[] = (data || []).map(row => {
          const printStart = new Date(row.print_start * 1000);
          const printEnd = new Date(row.print_end * 1000);
          
          return {
            id: row.id,
            filename: row.filename || '',
            status: (row.status as PrintJob['status']) || 'completed',
            total_duration: (row.total_duration || 0) / 60, // Convert seconds to minutes
            filament_total: (row.filament_total || 0) / 1000, // Convert mm to meters
            filament_type: row.filament_type || 'PLA',
            print_start: printStart,
            print_end: printEnd,
            filament_weight: row.filament_weight || 0,
            printer_name: row.printer_name || 'Unknown',
          };
        }).filter(job => {
          return job.print_start.getFullYear() > 2020 && 
                 job.print_start.getFullYear() < 2030;
        });

        console.log(`📋 usePrintJobs: Returning ${convertedData.length} converted jobs`);
        return convertedData;
      } catch (error) {
        console.error('💥 usePrintJobs: Critical error - NO FALLBACK TO MOCK DATA:', error);
        throw error; // Don't fall back to mock data - throw the error
      }
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePrintMetrics = (filters: FilterState) => {
  return useQuery({
    queryKey: ['printMetrics', filters],
    queryFn: async () => {
      console.log('📈 usePrintMetrics: Starting metrics calculation');
      
      // ALWAYS use real data - no fallback to mock
      const realMetrics = await getAllRealData(filters);
      if (realMetrics) {
        console.log('✅ usePrintMetrics: Using real database metrics');
        return realMetrics;
      }
      
      console.error('💥 usePrintMetrics: Failed to get real metrics - throwing error');
      throw new Error('Failed to fetch real metrics from database');
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
};

export const useChartData = (filters: FilterState) => {
  const { data: jobs, ...query } = usePrintJobs(filters);
  
  const chartData = jobs ? jobs.filter(job => !isActiveStatus(job.status) || job.status === 'in_progress').reduce((acc: Record<string, ChartData>, job) => {
    const date = new Date(job.print_start).toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = {
        date,
        printTime: 0,
        filamentUsed: 0,
        jobCount: 0,
        successRate: 0,
      };
    }
    
    acc[date].printTime += job.total_duration;
    acc[date].filamentUsed += (isSuccessfulStatus(job.status) || job.status === 'in_progress') ? job.filament_total : 0;
    acc[date].jobCount += 1;
    
    return acc;
  }, {}) : {};
  
  // Calculate success rates
  Object.keys(chartData).forEach(date => {
    const dayJobs = jobs?.filter(job => 
      new Date(job.print_start).toISOString().split('T')[0] === date && (!isActiveStatus(job.status) || job.status === 'in_progress')
    ) || [];
    const successCount = dayJobs.filter(job => isSuccessfulStatus(job.status) || job.status === 'in_progress').length;
    chartData[date].successRate = dayJobs.length > 0 ? (successCount / dayJobs.length) * 100 : 0;
  });
  
  return {
    ...query,
    data: Object.values(chartData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
};

// Filament Types Hook - fetch from Supabase
export const useFilamentTypes = () => {
  return useQuery({
    queryKey: ['filamentTypes'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('print_jobs')
          .select('filament_type')
          .not('filament_type', 'is', null);

        if (error) {
          console.error('Error fetching filament types:', error);
          throw error;
        }

        const types = [...new Set(data?.map(row => row.filament_type).filter(Boolean) || [])].sort();
        return types.length > 0 ? types : ['PLA', 'ABS', 'PETG', 'ASA', 'FLEX'];
      } catch (error) {
        console.error('Failed to fetch filament types from Supabase:', error);
        return ['PLA', 'ABS', 'PETG', 'ASA', 'FLEX'];
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
};

export const usePrinters = () => {
  return useQuery({
    queryKey: ['printers'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('print_jobs')
          .select('printer_name')
          .not('printer_name', 'is', null);

        if (error) {
          console.error('Error fetching printers:', error);
          throw error;
        }

        const printers = [...new Set(data?.map(row => row.printer_name).filter(Boolean) || [])].sort();
        return printers.length > 0 ? printers : ['Bumblebee', 'Sentinel', 'Micron', 'Drill Sargeant', 'VZBot', 'Blorange', 'Pinky', 'Berries and Cream', 'Slate'];
      } catch (error) {
        console.error('Failed to fetch printers from Supabase:', error);
        return ['Bumblebee', 'Sentinel', 'Micron', 'Drill Sargeant', 'VZBot', 'Blorange', 'Pinky', 'Berries and Cream', 'Slate'];
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
};
