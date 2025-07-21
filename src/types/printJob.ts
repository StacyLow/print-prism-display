export interface PrintJob {
  filename: string;
  status: 'success' | 'failed' | 'cancelled' | 'in_progress';
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