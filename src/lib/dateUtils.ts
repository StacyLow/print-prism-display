import { DateRange } from '@/types/printJob';

export interface DateRangeFilter {
  start_date: number; // Unix timestamp
  end_date: number;   // Unix timestamp
}

/**
 * Converts a DateRange string to actual start and end dates
 */
export function convertDateRangeToFilter(dateRange: DateRange): DateRangeFilter {
  const now = new Date();
  const endDate = new Date(now); // End date is always now
  const startDate = new Date(now);

  switch (dateRange) {
    case '1W':
      startDate.setDate(now.getDate() - 7);
      break;
    case '1M':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
      // For "ALL", we set a very early date
      startDate.setFullYear(2000, 0, 1);
      break;
    default:
      // Default to 1 month if unknown range
      startDate.setMonth(now.getMonth() - 1);
  }

  return {
    start_date: Math.floor(startDate.getTime() / 1000), // Convert to Unix timestamp
    end_date: Math.floor(endDate.getTime() / 1000)
  };
}

/**
 * Groups print jobs by date for chart data
 */
export function groupJobsByDate(jobs: any[], granularity: 'day' | 'week' | 'month' = 'day') {
  const grouped: Record<string, any[]> = {};

  jobs.forEach(job => {
    const date = new Date(job.print_start * 1000); // Convert from Unix timestamp
    let key: string;

    switch (granularity) {
      case 'week':
        // Get Monday of the week
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        key = monday.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'day':
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(job);
  });

  return grouped;
}

/**
 * Determines the best granularity for chart data based on date range
 */
export function getChartGranularity(dateRange: DateRange): 'day' | 'week' | 'month' {
  switch (dateRange) {
    case '1W':
      return 'day';
    case '1M':
      return 'day';
    case '3M':
      return 'week';
    case '6M':
    case '1Y':
      return 'month';
    case 'ALL':
      return 'month';
    default:
      return 'day';
  }
}