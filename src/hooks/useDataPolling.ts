import { useState, useCallback } from 'react';
import { usePolling } from './usePolling';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UseDataPollingOptions<T> {
  endpoint: string; // API endpoint to poll
  interval?: number; // Polling interval in milliseconds
  enabled?: boolean; // Enable/disable polling
  onSuccess?: (data: T) => void; // Success callback
  onError?: (error: Error) => void; // Error callback
  showErrorToast?: boolean; // Show error toast (default: false)
  transform?: (data: any) => T; // Transform response data
}

/**
 * Custom hook for polling API data with state management
 * Handles loading states, errors, and automatic updates
 * 
 * @param options - Configuration options
 * @returns Object with data, loading state, error, and refresh function
 */
export function useDataPolling<T = any>(options: UseDataPollingOptions<T>) {
  const {
    endpoint,
    interval = 30000,
    enabled = true,
    onSuccess,
    onError,
    showErrorToast = false,
    transform
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Don't show loading on subsequent polls (only on initial load)
      if (data === null) {
        setLoading(true);
      }

      const response = await api.get(endpoint);
      
      // Transform data if transform function provided
      const transformedData = transform 
        ? transform(response.data) 
        : response.data;

      setData(transformedData);
      setError(null);
      setLastUpdated(new Date());

      if (onSuccess) {
        onSuccess(transformedData);
      }
    } catch (err) {
      const error = err as Error;

      setError(error);

      if (showErrorToast) {
        toast.error(`Failed to fetch data: ${error.message}`);
      }

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, data, transform, onSuccess, onError, showErrorToast]);

  // Set up polling
  const { triggerPoll } = usePolling(fetchData, {
    interval,
    enabled,
    onError: (err) => {

      if (onError) {
        onError(err);
      }
    }
  });

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: triggerPoll
  };
}
