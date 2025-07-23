
export interface PrintJob {
  id: number; // Added id field from database
  filename: string;
  status: 'completed' | 'cancelled' | 'in_progress' | 'interrupted' | 'server_exit' | 'klippy_shutdown';
  total_duration: number; // in minutes (converted from seconds in database)
  filament_total: number; // in meters (converted from mm in database)
  filament_type: string;
  filament_weight: number; // in grams
  print_start: Date; // converted from unix timestamp
  print_end: Date; // converted from unix timestamp
  printer_name: string;
}

export interface TrendData {
  value: number;
  isPositive: boolean;
}

export interface MetricData {
  totalPrintTime: number;
  totalFilamentLength: number;
  totalFilamentWeight: number;
  successRate: number;
  totalJobs: number;
  avgPrintTime: number;
  statusBreakdown: {
    completed: number;
    cancelled: number;
    interrupted: number;
    server_exit: number;
    klippy_shutdown: number;
    in_progress: number;
  };
  mostUsedFilament: {
    type: string;
    count: number;
    percentage: number;
  };
  trends?: {
    totalPrintTime: TrendData;
    totalFilamentLength: TrendData;
    totalFilamentWeight: TrendData;
    successRate: TrendData;
    totalJobs: TrendData;
    avgPrintTime: TrendData;
  };
}

export interface ChartData {
  date: string;
  printTime: number;
  filamentUsed: number;
  jobCount: number;
  successRate: number;
}

export type DateRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface FilterState {
  dateRange: DateRange;
  filamentTypes: string[];
  printers: string[];
  compareEnabled: boolean;
}

// Status categorization helper functions
export const isSuccessfulStatus = (status: PrintJob['status']): boolean => {
  return status === 'completed';
};

export const isFailedStatus = (status: PrintJob['status']): boolean => {
  return ['cancelled', 'interrupted', 'server_exit', 'klippy_shutdown'].includes(status);
};

export const isActiveStatus = (status: PrintJob['status']): boolean => {
  return status === 'in_progress';
};

export const getStatusCategory = (status: PrintJob['status']): 'successful' | 'failed' | 'active' => {
  if (isSuccessfulStatus(status)) return 'successful';
  if (isActiveStatus(status)) return 'active';
  return 'failed';
};
