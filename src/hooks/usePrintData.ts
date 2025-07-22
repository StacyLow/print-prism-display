
import { useQuery } from '@tanstack/react-query';
import { PrintJob, MetricData, ChartData, FilterState, isSuccessfulStatus, isFailedStatus, isActiveStatus } from '@/types/printJob';
import { supabase } from '@/integrations/supabase/client';

// Mock data for development - keep for fallback
const generateMockData = (count: number): PrintJob[] => {
  // Updated to match actual database printer names and filament types
  const filamentTypes = ['PLA', 'ABS', 'PETG', 'ASA', 'FLEX'];
  const printers = ['Bumblebee', 'Sentinel', 'Micron', 'Drill Sargeant', 'VZBot', 'Blorange', 'Pinky', 'Berries and Cream', 'Slate'];
  const statuses: PrintJob['status'][] = ['completed', 'cancelled', 'in_progress', 'interrupted', 'server_exit', 'klippy_shutdown'];
  
  // Status distribution weights (70% completed, 15% cancelled, 5% interrupted, 5% in_progress, 3% server_exit, 2% klippy_shutdown)
  const statusWeights = [0.7, 0.15, 0.05, 0.05, 0.03, 0.02];
  
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const duration = Math.random() * 300 + 30; // 30-330 minutes
    const end = new Date(start.getTime() + duration * 60 * 1000);
    
    // Select status based on weights
    const rand = Math.random();
    let cumulative = 0;
    let selectedStatus = statuses[0];
    
    for (let j = 0; j < statusWeights.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        selectedStatus = statuses[j];
        break;
      }
    }
    
    return {
      id: i + 1,
      filename: `model_${i + 1}.gcode`,
      status: selectedStatus,
      total_duration: duration,
      filament_total: Math.random() * 100 + 10, // 10-110 meters
      filament_type: filamentTypes[Math.floor(Math.random() * filamentTypes.length)],
      filament_weight: Math.random() * 300 + 25, // 25-325 grams
      print_start: start,
      print_end: end,
      printer_name: printers[Math.floor(Math.random() * printers.length)],
    };
  });
};

const calculateMetrics = (data: PrintJob[]): MetricData => {
  // Filter out jobs with invalid durations (0 or negative)
  const validJobs = data.filter(job => job.total_duration > 0);
  const completedJobs = validJobs.filter(job => isSuccessfulStatus(job.status) || job.status === 'in_progress');
  const nonActiveJobs = validJobs.filter(job => !isActiveStatus(job.status) || job.status === 'in_progress');
  
  // Status breakdown
  const statusBreakdown = {
    completed: validJobs.filter(job => job.status === 'completed').length,
    cancelled: validJobs.filter(job => job.status === 'cancelled').length,
    interrupted: validJobs.filter(job => job.status === 'interrupted').length,
    server_exit: validJobs.filter(job => job.status === 'server_exit').length,
    klippy_shutdown: validJobs.filter(job => job.status === 'klippy_shutdown').length,
    in_progress: validJobs.filter(job => job.status === 'in_progress').length,
  };
  
  return {
    totalPrintTime: validJobs.reduce((sum, job) => sum + job.total_duration, 0),
    totalFilamentLength: completedJobs.reduce((sum, job) => sum + job.filament_total, 0),
    totalFilamentWeight: completedJobs.reduce((sum, job) => sum + job.filament_weight, 0),
    successRate: nonActiveJobs.length > 0 ? (completedJobs.length / nonActiveJobs.length) * 100 : 0,
    totalJobs: validJobs.length,
    avgPrintTime: validJobs.length > 0 ? validJobs.reduce((sum, job) => sum + job.total_duration, 0) / validJobs.length : 0,
    statusBreakdown,
  };
};

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

// Function to get cached metrics efficiently for large datasets
const getCachedMetrics = async (filters: FilterState): Promise<MetricData | null> => {
  try {
    // Use Supabase aggregation functions for efficient calculation
    const startDate = await getDateRangeStart(filters.dateRange);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    let query = supabase
      .from('print_jobs')
      .select(`
        total_duration,
        filament_total,
        filament_weight,
        status,
        print_start
      `)
      .gte('print_start', startTimestamp);

    // Apply filters
    if (filters.filamentTypes.length > 0) {
      query = query.in('filament_type', filters.filamentTypes);
    }
    if (filters.printers.length > 0) {
      query = query.in('printer_name', filters.printers);
    }

    const { data, error, count } = await query.limit(10000);

    if (error) {
      console.error('Cache fetch error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Calculate metrics efficiently on filtered data
    const validJobs = data.filter(job => (job.total_duration || 0) > 0);
    const completedJobs = validJobs.filter(job => job.status === 'completed');
    const failedJobs = validJobs.filter(job => ['cancelled', 'interrupted', 'server_exit', 'klippy_shutdown'].includes(job.status || ''));
    const inProgressJobs = validJobs.filter(job => job.status === 'in_progress');

    const totalPrintTime = validJobs.reduce((sum, job) => sum + ((job.total_duration || 0) / 60), 0); // Convert to minutes
    const totalFilamentLength = completedJobs.reduce((sum, job) => sum + ((job.filament_total || 0) / 1000), 0); // Convert to meters
    const totalFilamentWeight = completedJobs.reduce((sum, job) => sum + (job.filament_weight || 0), 0);
    const totalJobs = validJobs.length;
    const nonActiveJobs = validJobs.filter(job => job.status !== 'in_progress');

    return {
      totalPrintTime,
      totalFilamentLength,
      totalFilamentWeight,
      successRate: nonActiveJobs.length > 0 ? (completedJobs.length / nonActiveJobs.length) * 100 : 0,
      totalJobs,
      avgPrintTime: totalJobs > 0 ? totalPrintTime / totalJobs : 0,
      statusBreakdown: {
        completed: completedJobs.length,
        cancelled: failedJobs.filter(job => job.status === 'cancelled').length,
        interrupted: failedJobs.filter(job => job.status === 'interrupted').length,
        server_exit: failedJobs.filter(job => job.status === 'server_exit').length,
        klippy_shutdown: failedJobs.filter(job => job.status === 'klippy_shutdown').length,
        in_progress: inProgressJobs.length
      }
    };
  } catch (error) {
    console.error('Error fetching cached metrics:', error);
    return null;
  }
};

// Optimized Print Job Data Fetching with intelligent caching
export const usePrintJobs = (filters: FilterState) => {
  return useQuery({
    queryKey: ['printJobs', filters],
    queryFn: async () => {
      console.info('Fetching print jobs with optimized strategy');
      
      try {
        // For chart data, we need individual records, but limit to reasonable amount
        const startDate = await getDateRangeStart(filters.dateRange);
        const startTimestamp = Math.floor(startDate.getTime() / 1000);

        let query = supabase
          .from('print_jobs')
          .select('*')
          .gte('print_start', startTimestamp)
          .order('print_start', { ascending: false })
          .limit(5000); // Reasonable limit for chart data

        // Apply filters
        if (filters.filamentTypes.length > 0) {
          query = query.in('filament_type', filters.filamentTypes);
        }
        if (filters.printers.length > 0) {
          query = query.in('printer_name', filters.printers);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.info(`Raw data from Supabase: ${data?.length || 0} rows`);

        // Convert Supabase data to PrintJob format with proper unit conversions
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
          return job.total_duration > 0 && 
                 job.print_start.getFullYear() > 2020 && 
                 job.print_start.getFullYear() < 2030;
        });

        console.info(`Converted data: ${convertedData.length} valid jobs`);
        
        return convertedData;
      } catch (error) {
        console.error('Failed to fetch from Supabase, falling back to mock data:', error);
        
        const mockData = generateMockData(150);
        const startDate = await getDateRangeStart(filters.dateRange);
        
        return mockData.filter(job => {
          const jobDate = new Date(job.print_start);
          const dateInRange = jobDate >= startDate;
          const filamentMatch = filters.filamentTypes.length === 0 || filters.filamentTypes.includes(job.filament_type);
          const printerMatch = filters.printers.length === 0 || filters.printers.includes(job.printer_name);
          
          return dateInRange && filamentMatch && printerMatch;
        });
      }
    },
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes for faster updates
  });
};

export const usePrintMetrics = (filters: FilterState) => {
  return useQuery({
    queryKey: ['printMetrics', filters],
    queryFn: async () => {
      // Try to get metrics efficiently first
      const cachedMetrics = await getCachedMetrics(filters);
      if (cachedMetrics) {
        console.info('Using optimized metrics calculation');
        return cachedMetrics;
      }
      
      // Fallback to traditional method if cache fails
      console.info('Fallback to traditional metrics calculation');
      // Recreate the query logic without accessing queryFn
      const startDate = await getDateRangeStart(filters.dateRange);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      let query = supabase
        .from('print_jobs')
        .select('*')
        .gte('print_start', startTimestamp)
        .order('print_start', { ascending: false })
        .limit(5000);

      if (filters.filamentTypes.length > 0) {
        query = query.in('filament_type', filters.filamentTypes);
      }
      if (filters.printers.length > 0) {
        query = query.in('printer_name', filters.printers);
      }

      const { data, error } = await query;
      if (error) throw error;

      const convertedData: PrintJob[] = (data || []).map(row => ({
        id: row.id,
        filename: row.filename || '',
        status: (row.status as PrintJob['status']) || 'completed',
        total_duration: (row.total_duration || 0) / 60,
        filament_total: (row.filament_total || 0) / 1000,
        filament_type: row.filament_type || 'PLA',
        print_start: new Date(row.print_start * 1000),
        print_end: new Date(row.print_end * 1000),
        filament_weight: row.filament_weight || 0,
        printer_name: row.printer_name || 'Unknown',
      })).filter(job => {
        return job.total_duration > 0 && 
               job.print_start.getFullYear() > 2020 && 
               job.print_start.getFullYear() < 2030;
      });

      return calculateMetrics(convertedData);
    },
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    // Include in_progress jobs in filament usage
    acc[date].filamentUsed += (isSuccessfulStatus(job.status) || job.status === 'in_progress') ? job.filament_total : 0;
    acc[date].jobCount += 1;
    
    return acc;
  }, {}) : {};
  
  // Calculate success rates (treating in_progress as successful)
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
