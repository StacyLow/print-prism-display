
import { DatabaseConfig } from '@/types/database';
import { PrintJob, FilterState } from '@/types/printJob';

// Your API returns data in this format directly, no conversion needed for most fields
const convertApiRowToPrintJob = (row: any): PrintJob => {
  return {
    id: row.id,
    filename: row.filename,
    status: row.status as PrintJob['status'],
    // Your API returns duration in seconds, convert to minutes
    total_duration: row.total_duration / 60,
    // Your API returns filament in mm, convert to meters
    filament_total: row.filament_total / 1000,
    filament_type: row.filament_type === 'PET' ? 'PETG' : row.filament_type, // Normalize PET to PETG
    // Your API returns unix timestamps, convert to Date objects
    print_start: new Date(row.print_start * 1000),
    print_end: new Date(row.print_end * 1000),
    filament_weight: row.filament_weight,
    printer_name: row.printer_name,
  };
};

// Filter data on the frontend since your API returns all data
const filterPrintJobs = (data: PrintJob[], filters: FilterState): PrintJob[] => {
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

  const startDate = getDateRangeStart(filters.dateRange);
  
  return data.filter(job => {
    const jobDate = new Date(job.print_start);
    const dateInRange = jobDate >= startDate;
    const filamentMatch = filters.filamentTypes.length === 0 || filters.filamentTypes.includes(job.filament_type);
    const printerMatch = filters.printers.length === 0 || filters.printers.includes(job.printer_name);
    
    return dateInRange && filamentMatch && printerMatch;
  });
};

// Get the API base URL
const getApiBaseUrl = (): string => {
  // In production, use the backend port directly
  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  // In development, use the proxy
  return '';
};

// Fetch all print jobs from your Python API
export const fetchPrintJobsFromDatabase = async (
  config: DatabaseConfig,
  filters: FilterState
): Promise<PrintJob[]> => {
  console.log('=== FETCHING PRINT JOBS FROM PYTHON API ===');
  
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/print-jobs`;
    
    console.log('Making GET request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('API failed with status:', response.status, responseText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Your API returns a direct array of print job data
    const rawData = await response.json();
    console.log(`Received ${rawData.length} print jobs from API`);
    
    // Convert API data to our PrintJob format
    const convertedData = rawData.map(convertApiRowToPrintJob);
    
    // Apply filters on the frontend
    const filteredData = filterPrintJobs(convertedData, filters);
    console.log(`After filtering: ${filteredData.length} jobs`);
    
    return filteredData;
    
  } catch (error) {
    console.error('Failed to fetch print jobs from API:', error);
    throw error;
  }
};

// Extract unique filament types from the print jobs data
export const fetchFilamentTypesFromDatabase = async (config: DatabaseConfig): Promise<string[]> => {
  console.log('Extracting filament types from print jobs data...');
  
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/print-jobs`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Extract unique filament types and normalize PET to PETG
    const types = rawData.map((row: any) => row.filament_type === 'PET' ? 'PETG' : row.filament_type);
    const uniqueTypes = [...new Set(types)].sort();
    
    console.log('Available filament types:', uniqueTypes);
    return uniqueTypes;
    
  } catch (error) {
    console.error('Failed to fetch filament types:', error);
    // Return default types if API fetch fails
    return ['PLA', 'ABS', 'PETG', 'ASA', 'FLEX'];
  }
};

// Extract unique printer names from the print jobs data
export const fetchPrintersFromDatabase = async (config: DatabaseConfig): Promise<string[]> => {
  console.log('Extracting printer names from print jobs data...');
  
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/print-jobs`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Extract unique printer names
    const printers = [...new Set(rawData.map((row: any) => row.printer_name))].sort();
    
    console.log('Available printers:', printers);
    return printers;
    
  } catch (error) {
    console.error('Failed to fetch printers:', error);
    // Return default printers if API fetch fails
    return ['Bumblebee', 'Sentinel', 'Micron', 'Drill Sargeant', 'VZBot', 'Blorange', 'Pinky', 'Berries and Cream', 'Slate'];
  }
};
