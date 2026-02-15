/**
 * Smart Cache System for HMS
 * Reduces backend fetching by caching data in localStorage
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class CacheManager {
  private prefix = 'hms_cache_';

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, expiresIn: number = 60000): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem));
    } catch (error) {

    }
  }

  /**
   * Get data from cache
   * Returns null if expired or not found
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();
      const age = now - cacheItem.timestamp;

      // Check if expired
      if (age > cacheItem.expiresIn) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {

      return null;
    }
  }

  /**
   * Check if cache exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {

    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {

    }
  }

  /**
   * Get cache age in milliseconds
   */
  getAge(key: string): number | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const cacheItem: CacheItem<any> = JSON.parse(item);
      return Date.now() - cacheItem.timestamp;
    } catch (error) {
      return null;
    }
  }
}

export const cache = new CacheManager();

/**
 * Fetch with cache
 * 1. Return cached data immediately if available
 * 2. Fetch fresh data in background
 * 3. Update cache with fresh data
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    cacheTime?: number; // How long to cache (ms)
    staleTime?: number; // How long before refetching (ms)
  } = {}
): Promise<T> {
  const { cacheTime = 300000, staleTime = 60000 } = options; // 5min cache, 1min stale

  // Check cache
  const cached = cache.get<T>(key);
  const cacheAge = cache.getAge(key);

  // If cache exists and is fresh, return it
  if (cached && cacheAge !== null && cacheAge < staleTime) {

    return cached;
  }

  // If cache exists but stale, return it and fetch in background
  if (cached && cacheAge !== null && cacheAge < cacheTime) {

    // Fetch fresh data in background
    fetchFn().then(freshData => {
      cache.set(key, freshData, cacheTime);

    }).catch(error => {

    });

    return cached;
  }

  // No cache or expired, fetch fresh data

  const freshData = await fetchFn();
  cache.set(key, freshData, cacheTime);
  return freshData;
}

/**
 * Invalidate cache for a key or pattern
 */
export function invalidateCache(keyOrPattern: string): void {
  if (keyOrPattern.includes('*')) {
    // Pattern matching
    const pattern = keyOrPattern.replace('*', '');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.remove(key.replace('hms_cache_', ''));
      }
    });
  } else {
    cache.remove(keyOrPattern);
  }

}
