import { useState, useEffect } from 'react';
import { PrintJob } from '@/types/printJob';
import { useDatabaseConfig } from './useDatabaseConfig';
import { createDatabaseClient } from '@/lib/database';

export const usePrintData = () => {
  const [data, setData] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { config, isConfigured } = useDatabaseConfig();

  useEffect(() => {
    const fetchData = async () => {
      if (!isConfigured) {
        setError('Database not configured. Please configure your database in Settings.');
        setLoading(false);
        return;
      }

      try {
        const client = createDatabaseClient(config);
        let result;
        
        if (config.type === 'supabase') {
          result = await client.select('print_jobs', '*');
          if (result.error) throw result.error;
          setData(result.data || []);
        } else if (config.type === 'postgres') {
          result = await client.select('print_jobs', '*');
          if (result.error) throw result.error;
          // Sort by created_at descending manually for PostgreSQL
          const sortedJobs = (result.data || []).sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setData(sortedJobs);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config, isConfigured]);

  return { data, loading, error };
};