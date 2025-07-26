import { useQuery } from '@tanstack/react-query';
import { PrintJob, MetricData, ChartData, FilterState, isSuccessfulStatus, isFailedStatus, isActiveStatus } from '@/types/printJob';
import { useDatabaseConfig } from './useDatabaseConfig';
import { createDatabaseClient } from '@/lib/database';

// Simple data fetch for compatibility
export const usePrintJobs = (filters: FilterState) => {
  const { config, isConfigured } = useDatabaseConfig();
  
  return useQuery({
    queryKey: ['printJobs', filters, config],
    queryFn: async () => {
      if (!isConfigured) {
        throw new Error('Database not configured');
      }
      
      const client = createDatabaseClient(config);
      
      // Build filters for the query
      const queryFilters: Record<string, any> = {};
      
      if (filters.printers?.length) {
        queryFilters.printer_name = filters.printers[0];
      }
      
      if (filters.filamentTypes?.length) {
        queryFilters.filament_type = filters.filamentTypes[0];
      }
      
      // Note: Status filtering might need to be implemented differently
      // depending on how the FilterState interface defines status
      
      // Date range handling would need to be implemented based on 
      // the actual FilterState interface structure
      
      const result = await client.select('print_jobs', '*', queryFilters);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePrintMetrics = (filters: FilterState) => {
  const { config, isConfigured } = useDatabaseConfig();
  
  return useQuery({
    queryKey: ['printMetrics', filters, config],
    queryFn: async () => {
      if (!isConfigured) {
        throw new Error('Database not configured');
      }
      
      const client = createDatabaseClient(config);
      
      if (config.type === 'postgres') {
        // Use the custom metrics method for PostgreSQL
        const postgresClient = client.getClient() as any;
        return await postgresClient.getMetrics();
      } else {
        // Supabase implementation
        const result = await client.select('print_jobs', '*');
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        const jobs = result.data || [];
        
        // Calculate metrics from the jobs data
        const totalJobs = jobs.length;
        const completedJobs = jobs.filter((job: any) => job.status === 'completed').length;
        const failedJobs = jobs.filter((job: any) => 
          ['cancelled', 'interrupted', 'server_exit', 'klippy_shutdown'].includes(job.status)
        ).length;
        
        const totalPrintTime = jobs.reduce((sum: number, job: any) => 
          sum + (job.total_duration || 0), 0
        ) / 60; // Convert to minutes
        
        const totalFilamentLength = jobs.reduce((sum: number, job: any) => 
          sum + (job.filament_total || 0), 0
        ) / 1000; // Convert to meters
        
        const totalFilamentWeight = jobs.reduce((sum: number, job: any) => 
          sum + (job.filament_weight || 0), 0
        );
        
        const successRate = totalJobs > 0 ? (completedJobs / totalJobs * 100) : 0;
        const avgPrintTime = totalJobs > 0 ? totalPrintTime / totalJobs : 0;
        
        // Get most used filament
        const filamentCounts: Record<string, number> = {};
        jobs.forEach((job: any) => {
          if (job.filament_type) {
            filamentCounts[job.filament_type] = (filamentCounts[job.filament_type] || 0) + 1;
          }
        });
        
        const mostUsedEntry = Object.entries(filamentCounts).reduce(
          (max, [type, count]) => count > max.count ? { type, count } : max,
          { type: 'PLA', count: 0 }
        );
        
        return {
          totalPrintTime,
          totalFilamentLength,
          totalFilamentWeight,
          successRate: Math.round(successRate * 10) / 10,
          totalJobs,
          avgPrintTime,
          statusBreakdown: {
            completed: completedJobs,
            cancelled: jobs.filter((job: any) => job.status === 'cancelled').length,
            interrupted: jobs.filter((job: any) => job.status === 'interrupted').length,
            server_exit: jobs.filter((job: any) => job.status === 'server_exit').length,
            klippy_shutdown: jobs.filter((job: any) => job.status === 'klippy_shutdown').length,
            in_progress: jobs.filter((job: any) => job.status === 'in_progress').length
          },
          mostUsedFilament: {
            type: mostUsedEntry.type,
            count: mostUsedEntry.count,
            percentage: totalJobs > 0 ? Math.round((mostUsedEntry.count / totalJobs * 100) * 10) / 10 : 0
          }
        } as MetricData;
      }
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
};

export const useChartData = (filters: FilterState) => {
  const { data: jobs } = usePrintJobs(filters);
  
  // Return basic chart data structure for compatibility
  const chartData: ChartData[] = [];
  
  return {
    data: chartData,
    isLoading: false,
    error: null
  };
};

export const useFilamentTypes = () => {
  const { config, isConfigured } = useDatabaseConfig();
  
  return useQuery({
    queryKey: ['filamentTypes', config],
    queryFn: async () => {
      if (!isConfigured) {
        return [];
      }
      
      const client = createDatabaseClient(config);
      
      if (config.type === 'postgres') {
        const postgresClient = client.getClient() as any;
        return await postgresClient.getFilamentTypes();
      } else {
        // Supabase implementation - get distinct filament types
        const result = await client.select('print_jobs', 'filament_type');
        
        if (result.error) {
          return ['PLA', 'ABS', 'PETG', 'TPU']; // Default fallback
        }
        
        const types = [...new Set(
          (result.data || [])
            .map((job: any) => job.filament_type)
            .filter((type: string) => type && type.trim() !== '')
        )].sort();
        
        return types.length > 0 ? types : ['PLA', 'ABS', 'PETG', 'TPU'];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePrinters = () => {
  const { config, isConfigured } = useDatabaseConfig();
  
  return useQuery({
    queryKey: ['printers', config],
    queryFn: async () => {
      if (!isConfigured) {
        return [];
      }
      
      const client = createDatabaseClient(config);
      
      if (config.type === 'postgres') {
        const postgresClient = client.getClient() as any;
        return await postgresClient.getPrinters();
      } else {
        // Supabase implementation - get distinct printer names
        const result = await client.select('print_jobs', 'printer_name');
        
        if (result.error) {
          return [{ name: 'Printer 1', emoji: '🖨️' }]; // Default fallback
        }
        
        const printers = [...new Set(
          (result.data || [])
            .map((job: any) => job.printer_name)
            .filter((name: string) => name && name.trim() !== '')
        )].sort().map(name => ({ name, emoji: '🖨️' }));
        
        return printers.length > 0 ? printers : [{ name: 'Printer 1', emoji: '🖨️' }];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};