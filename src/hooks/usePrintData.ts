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

// Helper function to get previous period start/end dates
const getPreviousPeriodDates = async (range: FilterState['dateRange']): Promise<{ start: Date; end: Date }> => {
  if (range === 'ALL') {
    return { start: new Date('2020-01-01'), end: new Date() };
  }

  try {
    const { data: latestJob } = await supabase
      .from('print_jobs')
      .select('print_start')
      .order('print_start', { ascending: false })
      .limit(1)
      .single();

    const latestDate = latestJob ? new Date(latestJob.print_start * 1000) : new Date();
    
    let currentStart: Date;
    let periodLength: number;
    
    switch (range) {
      case '1W': 
        periodLength = 7 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
        break;
      case '1M':
        periodLength = 30 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
        break;
      case '3M':
        periodLength = 90 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
        break;
      case '6M':
        periodLength = 180 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
        break;
      case '1Y':
        periodLength = 365 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
        break;
      default:
        periodLength = 30 * 24 * 60 * 60 * 1000;
        currentStart = new Date(latestDate.getTime() - periodLength);
    }

    const previousStart = new Date(currentStart.getTime() - periodLength);
    const previousEnd = currentStart;

    return { start: previousStart, end: previousEnd };
  } catch (error) {
    console.error('Error calculating previous period:', error);
    return { start: new Date('2020-01-01'), end: new Date() };
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
        id,
        filament_type
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

    // Calculate most used filament type
    const filamentCounts = allJobs.reduce((acc, job) => {
      if (job.filament_type) {
        // Clean up filament type (remove duplicates like "PLA;PLA")
        const cleanType = job.filament_type.split(';')[0].trim().toUpperCase();
        if (cleanType && cleanType.length <= 10) { // Filter out overly long entries
          acc[cleanType] = (acc[cleanType] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedFilament = Object.entries(filamentCounts).reduce((a, b) => 
      filamentCounts[a[0]] > filamentCounts[b[0]] ? a : b
    , Object.entries(filamentCounts)[0] || ['PLA', 0]);

    console.log('🧮 Calculated totals:');
    console.log(`   Total Jobs: ${allJobs.length}`);
    console.log(`   Total Print Time: ${(totalPrintTime / 60).toFixed(1)} hours`);
    console.log(`   Total Filament Length: ${(totalFilamentLength / 1000).toFixed(1)} km`);
    console.log(`   Total Filament Weight: ${(totalFilamentWeight / 1000).toFixed(1)} kg`);
    console.log(`   Most Used Filament: ${mostUsedFilament[0]} (${mostUsedFilament[1]} jobs)`);

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
      },
      mostUsedFilament: {
        type: mostUsedFilament[0],
        count: mostUsedFilament[1],
        percentage: allJobs.length > 0 ? (mostUsedFilament[1] / allJobs.length) * 100 : 0
      }
    };

    console.log('🎯 Final metrics object:', metrics);
    return metrics;
  } catch (error) {
    console.error('💥 Error in getAllRealData:', error);
    return null;
  }
};

// Get previous period data for comparison
const getPreviousPeriodData = async (filters: FilterState): Promise<MetricData | null> => {
  if (filters.dateRange === 'ALL') {
    return null; // Can't compare "all time" with a previous period
  }

  try {
    const { start, end } = await getPreviousPeriodDates(filters.dateRange);
    
    let query = supabase
      .from('print_jobs')
      .select(`
        total_duration,
        filament_total,
        filament_weight,
        status,
        print_start,
        id,
        filament_type
      `)
      .gte('print_start', Math.floor(start.getTime() / 1000))
      .lt('print_start', Math.floor(end.getTime() / 1000));

    // Apply same filters as current period
    if (filters.filamentTypes.length > 0) {
      query = query.in('filament_type', filters.filamentTypes);
    }
    if (filters.printers.length > 0) {
      query = query.in('printer_name', filters.printers);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Previous period query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No previous period data');
      return null;
    }

    console.log(`📊 Previous period: ${data.length} jobs`);

    const allJobs = data;
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    const failedJobs = allJobs.filter(job => ['cancelled', 'interrupted', 'server_exit', 'klippy_shutdown'].includes(job.status || ''));
    const inProgressJobs = allJobs.filter(job => job.status === 'in_progress');
    const nonActiveJobs = allJobs.filter(job => job.status !== 'in_progress');

    const totalPrintTime = allJobs.reduce((sum, job) => sum + ((job.total_duration || 0) / 60), 0);
    const totalFilamentLength = allJobs.reduce((sum, job) => sum + ((job.filament_total || 0) / 1000), 0);
    const totalFilamentWeight = allJobs.reduce((sum, job) => sum + (job.filament_weight || 0), 0);

    const filamentCounts = allJobs.reduce((acc, job) => {
      if (job.filament_type) {
        const cleanType = job.filament_type.split(';')[0].trim().toUpperCase();
        if (cleanType && cleanType.length <= 10) {
          acc[cleanType] = (acc[cleanType] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedFilament = Object.entries(filamentCounts).reduce((a, b) => 
      filamentCounts[a[0]] > filamentCounts[b[0]] ? a : b
    , Object.entries(filamentCounts)[0] || ['PLA', 0]);

    return {
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
      },
      mostUsedFilament: {
        type: mostUsedFilament[0],
        count: mostUsedFilament[1],
        percentage: allJobs.length > 0 ? (mostUsedFilament[1] / allJobs.length) * 100 : 0
      }
    };
  } catch (error) {
    console.error('💥 Error getting previous period data:', error);
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
      
      const currentMetrics = await getAllRealData(filters);
      if (!currentMetrics) {
        console.error('💥 usePrintMetrics: Failed to get real metrics - throwing error');
        throw new Error('Failed to fetch real metrics from database');
      }

      // If comparison is enabled, get previous period data
      if (filters.compareEnabled) {
        const previousMetrics = await getPreviousPeriodData(filters);
        if (previousMetrics) {
          // Calculate trends
          const calculateTrend = (current: number, previous: number) => {
            if (previous === 0) return { value: 0, isPositive: true };
            const change = ((current - previous) / previous) * 100;
            return { value: Math.abs(change), isPositive: change >= 0 };
          };

          currentMetrics.trends = {
            totalPrintTime: calculateTrend(currentMetrics.totalPrintTime, previousMetrics.totalPrintTime),
            totalFilamentLength: calculateTrend(currentMetrics.totalFilamentLength, previousMetrics.totalFilamentLength),
            totalFilamentWeight: calculateTrend(currentMetrics.totalFilamentWeight, previousMetrics.totalFilamentWeight),
            successRate: calculateTrend(currentMetrics.successRate, previousMetrics.successRate),
            totalJobs: calculateTrend(currentMetrics.totalJobs, previousMetrics.totalJobs),
            avgPrintTime: calculateTrend(currentMetrics.avgPrintTime, previousMetrics.avgPrintTime),
          };

          console.log('📊 Trends calculated:', currentMetrics.trends);
        }
      }

      console.log('✅ usePrintMetrics: Using real database metrics');
      return currentMetrics;
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

// Clean up filament types to remove duplicates like "PLA;PLA" and weird entries
const cleanFilamentType = (type: string): string | null => {
  if (!type) return null;
  
  // Split by semicolon and take the first part
  const cleaned = type.split(';')[0].trim().toUpperCase();
  
  // Filter out empty strings, overly long entries, and invalid characters
  if (!cleaned || cleaned.length > 10 || /[^A-Z0-9+\-]/.test(cleaned)) {
    return null;
  }
  
  // Common filament types we want to keep
  const validTypes = ['PLA', 'ABS', 'PETG', 'ASA', 'TPU', 'FLEX', 'WOOD', 'METAL', 'CARBON', 'GLASS', 'SILK', 'MARBLE', 'GLOW', 'CLEAR', 'TRANSPARENT', 'BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'GRAY', 'GREY', 'SILVER', 'GOLD', 'BRONZE'];
  
  // If it's a known type or follows common patterns, keep it
  if (validTypes.includes(cleaned) || /^[A-Z]{2,6}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
};

// Filament Types Hook - fetch from Supabase with cleaning
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

        // Clean and deduplicate filament types
        const cleanedTypes = data
          ?.map(row => cleanFilamentType(row.filament_type))
          .filter(Boolean) as string[];

        const uniqueTypes = [...new Set(cleanedTypes)].sort();
        
        console.log('🧵 Cleaned filament types:', uniqueTypes);
        
        return uniqueTypes.length > 0 ? uniqueTypes : ['PLA', 'ABS', 'PETG', 'ASA', 'TPU'];
      } catch (error) {
        console.error('Failed to fetch filament types from Supabase:', error);
        return ['PLA', 'ABS', 'PETG', 'ASA', 'TPU'];
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
};

// Printer names with emojis mapping
const printerEmojis: Record<string, string> = {
  'Bumblebee': '🐝',
  'Sentinel': '🛡️',
  'Micron': '🔬',
  'Drill Sargeant': '🪖',
  'VZBot': '🤖',
  'Blorange': '🍊',
  'Pinky': '🌸',
  'Berries and Cream': '🍓',
  'Slate': '🪨',
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
        
        // Add emojis to printer names
        const printersWithEmojis = printers.map(printer => ({
          name: printer,
          emoji: printerEmojis[printer] || '🖨️'
        }));
        
        return printersWithEmojis.length > 0 ? printersWithEmojis : [
          { name: 'Bumblebee', emoji: '🐝' },
          { name: 'Sentinel', emoji: '🛡️' },
          { name: 'Micron', emoji: '🔬' },
          { name: 'Drill Sargeant', emoji: '🪖' },
          { name: 'VZBot', emoji: '🤖' },
          { name: 'Blorange', emoji: '🍊' },
          { name: 'Pinky', emoji: '🌸' },
          { name: 'Berries and Cream', emoji: '🍓' },
          { name: 'Slate', emoji: '🪨' },
        ];
      } catch (error) {
        console.error('Failed to fetch printers from Supabase:', error);
        return [
          { name: 'Bumblebee', emoji: '🐝' },
          { name: 'Sentinel', emoji: '🛡️' },
          { name: 'Micron', emoji: '🔬' },
          { name: 'Drill Sargeant', emoji: '🪖' },
          { name: 'VZBot', emoji: '🤖' },
          { name: 'Blorange', emoji: '🍊' },
          { name: 'Pinky', emoji: '🌸' },
          { name: 'Berries and Cream', emoji: '🍓' },
          { name: 'Slate', emoji: '🪨' },
        ];
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
};
