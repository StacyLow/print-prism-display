
export interface PrintJob {
  filename: string;
  status: 'completed' | 'cancelled' | 'in_progress' | 'interrupted' | 'server_exit' | 'klippy_shutdown';
  total_duration: number; // in minutes
  filament_total: number; // in meters
  filament_type: string;
  filament_weight: number; // in grams
  print_start: Date;
  print_end: Date;
  printer_name: string;
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
