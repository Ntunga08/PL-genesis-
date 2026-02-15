import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface PaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface UseOptimizedDataOptions<T> {
  endpoint: string;
  params?: Record<string, any>;
  enabled?: boolean;
  pollInterval?: number; // 0 = no polling
  onSuccess?: (data: T[], pagination: PaginationInfo) => void;
  onError?: (error: Error) => void;
  cacheKey?: string;
}

interface UseOptimizedDataReturn<T> {
  data: T[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

/**
 * Optimized data fetching hook with:
 * - Pagination support
 * - Optional polling
 * - Proper cleanup
 * - Loading states
 * - Error handling
 */
export function useOptimizedData<T = any>(
  options: UseOptimizedDataOptions<T>
): UseOptimizedDataReturn<T> {
  const {
    endpoint,
    params = {},
    enabled = true,
    pollInterval = 0,
    onSuccess,
    onError,
    cacheKey
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch data function
  const fetchData = useCallback(async (page = 1, append = false) => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (append) {
        setIsLoadingMore(true);
      } else if (page === 1) {
        setLoading(true);
      }

      const response = await api.get(endpoint, {
        params: { ...params, page, per_page: 20 },
        signal: abortControllerRef.current.signal
      });

      if (!isMountedRef.current) return;

      const newData = response.data.data || response.data.appointments || response.data.visits || [];
      const paginationInfo = response.data.pagination;

      if (append) {
        setData(prev => [...prev, ...newData]);
      } else {
        setData(newData);
      }

      setPagination(paginationInfo);
      setError(null);

      if (onSuccess) {
        onSuccess(newData, paginationInfo);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Request was cancelled, ignore
        return;
      }

      if (!isMountedRef.current) return;

      const error = err as Error;

      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [endpoint, params, enabled, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    fetchData(1, false);
  }, [enabled, endpoint, JSON.stringify(params)]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval === 0) return;

    pollTimerRef.current = setInterval(() => {
      // Silent refresh - don't show loading
      fetchData(pagination?.current_page || 1, false);
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [enabled, pollInterval, pagination?.current_page, fetchData]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!pagination || pagination.current_page >= pagination.last_page) {
      return;
    }

    await fetchData(pagination.current_page + 1, true);
  }, [pagination, fetchData]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchData(1, false);
  }, [fetchData]);

  const hasMore = pagination ? pagination.current_page < pagination.last_page : false;

  return {
    data,
    pagination,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore
  };
}
