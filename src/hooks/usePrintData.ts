import { useQuery } from '@tanstack/react-query';
import { PrintJob, MetricData, ChartData, FilterState, isSuccessfulStatus, isFailedStatus, isActiveStatus } from '@/types/printJob';
import { useDatabaseContext } from '@/contexts/DatabaseContext';

// Mock data for development - replace with actual API calls
const generateMockData = (count: number): PrintJob[] => {
  const filamentTypes = ['PLA', 'ABS', 'PETG', 'TPU', 'WOOD'];
  const printers = ['Printer A', 'Printer B', 'Printer C', 'Printer D'];
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

// Function to fetch data from database
const fetchDatabaseData = async (filters: FilterState): Promise<PrintJob[]> => {
  // This would be replaced with actual database query
  // For now, we'll simulate a database call that returns all available data
  console.log('Fetching data from database with filters:', filters);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Replace with actual database query
  // Example: const response = await fetch('/api/print-jobs', { ... });
  // For now, return empty array since we don't have actual DB connection
  return [];
};

const getDateRangeStart = (range: FilterState['dateRange']): Date => {
  const now = new Date();
  switch (range) {
    case '1W': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1M': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3M': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '6M': return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case '1Y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'ALL': return new Date(2020, 0, 1);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

const filterData = (data: PrintJob[], filters: FilterState): PrintJob[] => {
  const startDate = getDateRangeStart(filters.dateRange);
  
  return data.filter(job => {
    const jobDate = new Date(job.print_start);
    const dateInRange = jobDate >= startDate;
    const filamentMatch = filters.filamentTypes.length === 0 || filters.filamentTypes.includes(job.filament_type);
    const printerMatch = filters.printers.length === 0 || filters.printers.includes(job.printer_name);
    
    return dateInRange && filamentMatch && printerMatch;
  });
};

const calculateMetrics = (data: PrintJob[]): MetricData => {
  const completedJobs = data.filter(job => isSuccessfulStatus(job.status) || job.status === 'in_progress');
  const nonActiveJobs = data.filter(job => !isActiveStatus(job.status) || job.status === 'in_progress');
  
  // Status breakdown
  const statusBreakdown = {
    completed: data.filter(job => job.status === 'completed').length,
    cancelled: data.filter(job => job.status === 'cancelled').length,
    interrupted: data.filter(job => job.status === 'interrupted').length,
    server_exit: data.filter(job => job.status === 'server_exit').length,
    klippy_shutdown: data.filter(job => job.status === 'klippy_shutdown').length,
    in_progress: data.filter(job => job.status === 'in_progress').length,
  };
  
  return {
    totalPrintTime: data.reduce((sum, job) => sum + job.total_duration, 0),
    totalFilamentLength: completedJobs.reduce((sum, job) => sum + job.filament_total, 0),
    totalFilamentWeight: completedJobs.reduce((sum, job) => sum + job.filament_weight, 0),
    successRate: nonActiveJobs.length > 0 ? (completedJobs.length / nonActiveJobs.length) * 100 : 0,
    totalJobs: data.length,
    avgPrintTime: data.length > 0 ? data.reduce((sum, job) => sum + job.total_duration, 0) / data.length : 0,
    statusBreakdown,
  };
};

export const usePrintJobs = (filters: FilterState) => {
  const { connectionStatus, isUsingMockData } = useDatabaseContext();
  
  return useQuery({
    queryKey: ['printJobs', filters, connectionStatus.isConnected, isUsingMockData],
    queryFn: async () => {
      console.log('Database connected:', connectionStatus.isConnected);
      console.log('Using mock data:', isUsingMockData);
      
      // Use database data if connected and not using mock data
      if (connectionStatus.isConnected && !isUsingMockData) {
        try {
          const databaseData = await fetchDatabaseData(filters);
          return filterData(databaseData, filters);
        } catch (error) {
          console.error('Failed to fetch database data:', error);
          // Fall back to mock data if database fetch fails
          const mockData = generateMockData(150);
          return filterData(mockData, filters);
        }
      } else {
        // Use mock data
        console.log('Using mock data - generating 150 entries');
        const mockData = generateMockData(150);
        return filterData(mockData, filters);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePrintMetrics = (filters: FilterState) => {
  const { data: jobs, ...query } = usePrintJobs(filters);
  
  return {
    ...query,
    data: jobs ? calculateMetrics(jobs) : undefined,
  };
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

export const useFilamentTypes = () => {
  return useQuery({
    queryKey: ['filamentTypes'],
    queryFn: async () => {
      // In real app, fetch from API
      return ['PLA', 'ABS', 'PETG', 'TPU', 'WOOD', 'ASA', 'PC'];
    },
  });
};

export const usePrinters = () => {
  return useQuery({
    queryKey: ['printers'],
    queryFn: async () => {
      // In real app, fetch from API
      return ['Printer A', 'Printer B', 'Printer C', 'Printer D'];
    },
  });
};
