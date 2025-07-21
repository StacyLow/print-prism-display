import { DatabaseConfig } from '@/types/database';
import { PrintJob, FilterState } from '@/types/printJob';

// Database row interface matching the actual schema
interface DatabaseRow {
  id: number;
  filename: string;
  status: string;
  total_duration: number; // seconds
  filament_total: number; // mm
  filament_type: string;
  print_start: number; // unix timestamp
  print_end: number; // unix timestamp
  filament_weight: number; // grams
  printer_name: string;
}

// Convert database row to PrintJob
const convertDatabaseRowToPrintJob = (row: DatabaseRow): PrintJob => {
  return {
    id: row.id,
    filename: row.filename,
    status: row.status as PrintJob['status'],
    total_duration: row.total_duration / 60, // Convert seconds to minutes
    filament_total: row.filament_total / 1000, // Convert mm to meters
    filament_type: row.filament_type === 'PET' ? 'PETG' : row.filament_type, // Normalize PET to PETG
    print_start: new Date(row.print_start * 1000), // Convert unix timestamp to Date
    print_end: new Date(row.print_end * 1000), // Convert unix timestamp to Date
    filament_weight: row.filament_weight,
    printer_name: row.printer_name,
  };
};

// Build SQL query with filters
const buildFilteredQuery = (filters: FilterState): { query: string; params: any[] } => {
  let query = 'SELECT * FROM print_jobs WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  // Date range filter
  if (filters.dateRange !== 'ALL') {
    const now = Math.floor(Date.now() / 1000); // Current unix timestamp
    let startTime: number;
    
    switch (filters.dateRange) {
      case '1W': startTime = now - (7 * 24 * 60 * 60); break;
      case '1M': startTime = now - (30 * 24 * 60 * 60); break;
      case '3M': startTime = now - (90 * 24 * 60 * 60); break;
      case '6M': startTime = now - (180 * 24 * 60 * 60); break;
      case '1Y': startTime = now - (365 * 24 * 60 * 60); break;
      default: startTime = now - (30 * 24 * 60 * 60);
    }
    
    query += ` AND print_start >= $${paramIndex}`;
    params.push(startTime);
    paramIndex++;
  }

  // Filament type filter
  if (filters.filamentTypes.length > 0) {
    // Handle PET/PETG normalization in query
    const normalizedTypes = filters.filamentTypes.flatMap(type => 
      type === 'PETG' ? ['PETG', 'PET'] : [type]
    );
    const placeholders = normalizedTypes.map(() => `$${paramIndex++}`).join(',');
    query += ` AND filament_type IN (${placeholders})`;
    params.push(...normalizedTypes);
  }

  // Printer filter
  if (filters.printers.length > 0) {
    const placeholders = filters.printers.map(() => `$${paramIndex++}`).join(',');
    query += ` AND printer_name IN (${placeholders})`;
    params.push(...filters.printers);
  }

  query += ' ORDER BY print_start DESC';
  return { query, params };
};

// Utility function to safely read and parse JSON responses
const parseJsonResponse = async (response: Response) => {
  console.log('Parsing response:', {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type')
  });

  // Read the response body once and store it
  const responseText = await response.text();
  console.log('Raw response text:', responseText);
  
  if (!responseText.trim()) {
    throw new Error('Empty response received from server');
  }
  
  // Try to parse as JSON
  try {
    const data = JSON.parse(responseText);
    console.log('Successfully parsed JSON:', data);
    return data;
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    console.error('Response text that failed to parse:', responseText);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`);
    } else {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
  }
};

// Execute database query
export const fetchPrintJobsFromDatabase = async (
  config: DatabaseConfig,
  filters: FilterState
): Promise<PrintJob[]> => {
  console.log('=== FETCHING PRINT JOBS FROM DATABASE ===');
  console.log('Database config:', { ...config, password: '***' });
  
  try {
    const { query, params } = buildFilteredQuery(filters);
    console.log('Executing query:', query);
    console.log('Query parameters:', params);
    
    // Make HTTP request to backend API that will execute the PostgreSQL query
    console.log('Making request to /api/print-jobs...');
    const response = await fetch('/api/print-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config,
        query,
        params,
      }),
    });

    console.log('Print jobs API response status:', response.status);

    if (!response.ok) {
      console.error('Print jobs API failed with status:', response.status);
      
      // Read response body once for error handling
      const responseText = await response.text();
      let errorMessage = `Database query failed: ${response.status} ${response.statusText}`;
      
      if (responseText.trim()) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${responseText.substring(0, 100)}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await parseJsonResponse(response);
    console.log('Print jobs API response data:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Database query failed');
    }

    console.log(`Successfully fetched ${data.rows.length} rows from database`);
    
    // Convert database rows to PrintJob objects
    return data.rows.map(convertDatabaseRowToPrintJob);
    
  } catch (error) {
    console.error('Database fetch error:', error);
    throw error;
  }
};

// Get available filament types from database
export const fetchFilamentTypesFromDatabase = async (config: DatabaseConfig): Promise<string[]> => {
  console.log('Fetching filament types from database...');
  
  try {
    const response = await fetch('/api/filament-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    console.log('Filament types API response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Filament types API failed:', responseText);
      throw new Error(`Failed to fetch filament types: ${response.status} ${response.statusText}`);
    }

    const data = await parseJsonResponse(response);
    console.log('Filament types API response data:', data);
    
    // Normalize PET to PETG and remove duplicates
    const types = (data.types as string[]).map((type: string) => type === 'PET' ? 'PETG' : type);
    return [...new Set(types)].sort();
    
  } catch (error) {
    console.error('Failed to fetch filament types:', error);
    // Return default types if database fetch fails
    return ['PLA', 'ABS', 'PETG', 'ASA', 'FLEX'];
  }
};

// Get available printers from database
export const fetchPrintersFromDatabase = async (config: DatabaseConfig): Promise<string[]> => {
  console.log('Fetching printers from database...');
  
  try {
    const response = await fetch('/api/printers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    console.log('Printers API response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Printers API failed:', responseText);
      throw new Error(`Failed to fetch printers: ${response.status} ${response.statusText}`);
    }

    const data = await parseJsonResponse(response);
    console.log('Printers API response data:', data);
    
    return data.printers.sort();
    
  } catch (error) {
    console.error('Failed to fetch printers:', error);
    // Return default printers if database fetch fails
    return ['Bumblebee', 'Sentinel', 'Micron', 'Drill Sargeant', 'VZBot', 'Blorange', 'Pinky', 'Berries and Cream', 'Slate'];
  }
};
