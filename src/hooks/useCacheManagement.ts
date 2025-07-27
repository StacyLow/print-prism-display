import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabaseConfig } from './useDatabaseConfig';
import { createPostgresClient } from '@/lib/postgres';
import { useToast } from './use-toast';

interface CacheStatus {
  cache: {
    total_entries: number;
    overall_entries: number;
    daily_entries: number;
    earliest_date: string | null;
    latest_date: string | null;
    last_updated: string | null;
  };
  print_jobs: {
    total: number;
    earliest: number | null;
    latest: number | null;
  };
}

interface RebuildResponse {
  success: boolean;
  message: string;
  stats: {
    total_entries: number;
    overall_entries: number;
    daily_entries: number;
  };
}

export const useCacheManagement = () => {
  const { config } = useDatabaseConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Get cache status
  const { data: cacheStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['cacheStatus', config],
    queryFn: async (): Promise<CacheStatus> => {
      if (config.type !== 'postgres') {
        throw new Error('Cache management only available for PostgreSQL');
      }
      
      const client = createPostgresClient(config.postgres!);
      const response = await fetch('/api/cache-status', {
        headers: {
          'X-DB-Config': JSON.stringify(config.postgres)
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch cache status');
      }
      
      return response.json();
    },
    enabled: config.type === 'postgres' && !!config.postgres?.host,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Rebuild cache mutation
  const rebuildCacheMutation = useMutation({
    mutationFn: async (): Promise<RebuildResponse> => {
      if (config.type !== 'postgres') {
        throw new Error('Cache management only available for PostgreSQL');
      }

      const response = await fetch('/api/rebuild-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Config': JSON.stringify(config.postgres)
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rebuild cache');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cache Rebuilt Successfully",
        description: `Created ${data.stats.total_entries} cache entries (${data.stats.daily_entries} daily, ${data.stats.overall_entries} overall)`,
      });
      
      // Refetch cache status and invalidate related queries
      refetch();
      queryClient.invalidateQueries({ queryKey: ['printMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['chartData'] });
    },
    onError: (error) => {
      toast({
        title: "Cache Rebuild Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  });

  const rebuildCache = async () => {
    setIsRebuilding(true);
    try {
      await rebuildCacheMutation.mutateAsync();
    } finally {
      setIsRebuilding(false);
    }
  };

  const getCacheHealth = () => {
    if (!cacheStatus) return 'unknown';
    
    const { cache, print_jobs } = cacheStatus;
    
    if (cache.total_entries === 0) return 'empty';
    if (print_jobs.total > 0 && cache.total_entries < print_jobs.total / 10) return 'needs_rebuild';
    
    return 'healthy';
  };

  const formatCacheInfo = () => {
    if (!cacheStatus) return null;
    
    const { cache, print_jobs } = cacheStatus;
    const health = getCacheHealth();
    
    return {
      health,
      totalEntries: cache.total_entries,
      dailyEntries: cache.daily_entries,
      overallEntries: cache.overall_entries,
      lastUpdated: cache.last_updated ? new Date(cache.last_updated) : null,
      dateRange: cache.earliest_date && cache.latest_date 
        ? {
            start: new Date(cache.earliest_date),
            end: new Date(cache.latest_date)
          }
        : null,
      printJobsTotal: print_jobs.total,
      coverage: print_jobs.total > 0 ? Math.round((cache.total_entries / print_jobs.total) * 100) : 0
    };
  };

  return {
    cacheStatus,
    isLoading,
    error,
    isRebuilding: isRebuilding || rebuildCacheMutation.isPending,
    rebuildCache,
    getCacheHealth,
    formatCacheInfo,
    refetch
  };
};