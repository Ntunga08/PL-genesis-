import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Declare Pusher globally for Laravel Echo
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any> | null;
  }
}

// Initialize Pusher
window.Pusher = Pusher;

// Initialize Laravel Echo (singleton)
let echoInstance: Echo<any> | null = null;

function getEcho(): Echo<any> {
  if (!echoInstance) {
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: import.meta.env.VITE_PUSHER_APP_KEY || 'local-key',
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
      wsHost: import.meta.env.VITE_PUSHER_HOST || '127.0.0.1',
      wsPort: import.meta.env.VITE_PUSHER_PORT || 6001,
      wssPort: import.meta.env.VITE_PUSHER_PORT || 6001,
      forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',
      encrypted: import.meta.env.VITE_PUSHER_SCHEME === 'https',
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
    });

    window.Echo = echoInstance;
  }

  return echoInstance;
}

interface UseWebSocketOptions {
  channel: string;
  event: string;
  onMessage: (data: any) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to WebSocket events
 * Provides real-time updates without polling
 * 
 * @example
 * useWebSocket({
 *   channel: 'doctor-queue',
 *   event: 'visit.updated',
 *   onMessage: (data) => {
 *     
 *     // Update local state
 *   }
 * });
 */
export function useWebSocket(options: UseWebSocketOptions) {
  const { channel, event, onMessage, enabled = true } = options;
  const callbackRef = useRef(onMessage);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const echo = getEcho();
    
    // Subscribe to channel
    const channelInstance = echo.channel(channel);

    // Listen for event
    channelInstance.listen(`.${event}`, (data: any) => {

      callbackRef.current(data);
    });

    // Cleanup
    return () => {
      channelInstance.stopListening(`.${event}`);
      echo.leaveChannel(channel);
    };
  }, [channel, event, enabled]);
}

/**
 * Hook for subscribing to multiple WebSocket events
 * 
 * @example
 * useWebSocketMultiple([
 *   {
 *     channel: 'doctor-queue',
 *     event: 'visit.updated',
 *     onMessage: handleVisitUpdate
 *   },
 *   {
 *     channel: 'appointments',
 *     event: 'appointment.updated',
 *     onMessage: handleAppointmentUpdate
 *   }
 * ]);
 */
export function useWebSocketMultiple(subscriptions: UseWebSocketOptions[]) {
  subscriptions.forEach(subscription => {
    useWebSocket(subscription);
  });
}

/**
 * Disconnect from all WebSocket channels
 * Call this when user logs out
 */
export function disconnectWebSocket() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
    window.Echo = null;
  }
}
