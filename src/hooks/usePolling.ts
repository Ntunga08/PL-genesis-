import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number; // Polling interval in milliseconds (default: 30000)
  enabled?: boolean; // Enable/disable polling (default: true)
  onError?: (error: Error) => void; // Error callback
}

/**
 * Custom hook for polling data at regular intervals
 * Automatically handles cleanup and prevents memory leaks
 * 
 * @param callback - Function to execute on each poll
 * @param options - Polling configuration options
 */
export function usePolling(
  callback: () => Promise<void> | void,
  options: UsePollingOptions = {}
) {
  const {
    interval = 30000, // Default 30 seconds
    enabled = true,
    onError
  } = options;

  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up polling
  useEffect(() => {
    // Don't start polling if disabled
    if (!enabled) {
      return;
    }

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {

        if (onError) {
          onError(error as Error);
        }
      }
    };

    // Execute immediately on mount
    tick();

    // Set up interval
    intervalRef.current = setInterval(tick, interval);

    // Cleanup function - CRITICAL for preventing memory leaks
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled, onError]);

  // Return function to manually trigger polling
  const triggerPoll = useCallback(async () => {
    try {
      await savedCallback.current();
    } catch (error) {

      if (onError) {
        onError(error as Error);
      }
    }
  }, [onError]);

  return { triggerPoll };
}
