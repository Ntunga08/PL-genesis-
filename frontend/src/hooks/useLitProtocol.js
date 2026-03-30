import { useEffect, useState } from 'react';
import { initLitClient } from '../utils/litProtocol';

export function useLitProtocol() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log('🔥 Initializing Lit Protocol...');
        await initLitClient();
        if (mounted) {
          setIsInitialized(true);
          console.log('✅ Lit Protocol initialized');
        }
      } catch (err) {
        console.error('❌ Failed to initialize Lit Protocol:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, error };
}
