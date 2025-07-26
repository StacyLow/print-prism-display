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
      
      // Return empty array for now - to be implemented
      return [] as PrintJob[];
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
      
      // Return basic metrics structure for compatibility
      return {
        totalPrintTime: 0,
        totalFilamentLength: 0,
        totalFilamentWeight: 0,
        successRate: 0,
        totalJobs: 0,
        avgPrintTime: 0,
        statusBreakdown: {
          completed: 0,
          cancelled: 0,
          interrupted: 0,
          server_exit: 0,
          klippy_shutdown: 0,
          in_progress: 0
        },
        mostUsedFilament: {
          type: 'PLA',
          count: 0,
          percentage: 0
        }
      } as MetricData;
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
      
      // Return default filament types for compatibility
      return ['PLA', 'ABS', 'PETG', 'TPU'];
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
      
      // Return default printer for compatibility
      return [{ name: 'Printer 1', emoji: '🖨️' }];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};