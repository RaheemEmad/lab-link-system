/**
 * Multi-layer caching system for optimal performance
 * Uses memory, localStorage, and IndexedDB for different data types
 */

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'indexedDB';
  prefix?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly defaultPrefix = 'lablink_cache';

  /**
   * Set a cached value
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = this.defaultTTL,
      storage = 'memory',
      prefix = this.defaultPrefix,
    } = options;

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
    };

    const fullKey = `${prefix}:${key}`;

    switch (storage) {
      case 'memory':
        this.memoryCache.set(fullKey, entry);
        break;

      case 'localStorage':
        try {
          localStorage.setItem(fullKey, JSON.stringify(entry));
        } catch (error) {
          console.warn('localStorage cache failed:', error);
          // Fallback to memory
          this.memoryCache.set(fullKey, entry);
        }
        break;

      case 'indexedDB':
        await this.setIndexedDB(fullKey, entry);
        break;
    }
  }

  /**
   * Get a cached value
   */
  async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const {
      storage = 'memory',
      prefix = this.defaultPrefix,
    } = options;

    const fullKey = `${prefix}:${key}`;
    let entry: CacheEntry<T> | null = null;

    switch (storage) {
      case 'memory':
        entry = this.memoryCache.get(fullKey) || null;
        break;

      case 'localStorage':
        try {
          const stored = localStorage.getItem(fullKey);
          entry = stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.warn('localStorage read failed:', error);
        }
        break;

      case 'indexedDB':
        entry = await this.getIndexedDB<T>(fullKey);
        break;
    }

    if (!entry) return null;

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      await this.delete(key, { storage, prefix });
      return null;
    }

    return entry.data;
  }

  /**
   * Delete a cached value
   */
  async delete(
    key: string,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      storage = 'memory',
      prefix = this.defaultPrefix,
    } = options;

    const fullKey = `${prefix}:${key}`;

    switch (storage) {
      case 'memory':
        this.memoryCache.delete(fullKey);
        break;

      case 'localStorage':
        try {
          localStorage.removeItem(fullKey);
        } catch (error) {
          console.warn('localStorage delete failed:', error);
        }
        break;

      case 'indexedDB':
        await this.deleteIndexedDB(fullKey);
        break;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(options: { storage?: 'memory' | 'localStorage' | 'indexedDB' } = {}): Promise<void> {
    const { storage } = options;

    if (!storage || storage === 'memory') {
      this.memoryCache.clear();
    }

    if (!storage || storage === 'localStorage') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.defaultPrefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('localStorage clear failed:', error);
      }
    }

    if (!storage || storage === 'indexedDB') {
      await this.clearIndexedDB();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    let localStorageSize = 0;
    
    try {
      const keys = Object.keys(localStorage);
      localStorageSize = keys.filter(k => k.startsWith(this.defaultPrefix)).length;
    } catch (error) {
      console.warn('Could not read localStorage stats:', error);
    }

    return {
      memory: {
        entries: memorySize,
        bytes: this.estimateMemorySize(),
      },
      localStorage: {
        entries: localStorageSize,
      },
    };
  }

  /**
   * Estimate memory cache size in bytes
   */
  private estimateMemorySize(): number {
    let size = 0;
    this.memoryCache.forEach((value) => {
      try {
        size += JSON.stringify(value).length * 2; // UTF-16 = 2 bytes per char
      } catch (error) {
        // Skip if can't stringify
      }
    });
    return size;
  }

  /**
   * IndexedDB operations
   */
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LabLinkCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      };
    });
  }

  private async setIndexedDB<T>(key: string, value: CacheEntry<T>): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.put(value, key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('IndexedDB write failed:', error);
      // Fallback to memory
      this.memoryCache.set(key, value);
    }
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('IndexedDB read failed:', error);
      return null;
    }
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('IndexedDB delete failed:', error);
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__cache = cache;
}

/**
 * Predefined cache strategies for common data types
 */
export const CACHE_STRATEGIES = {
  // User profile: 15 minutes in localStorage
  USER_PROFILE: {
    ttl: 15 * 60 * 1000,
    storage: 'localStorage' as const,
  },
  
  // Orders list: 30 seconds in memory
  ORDERS_LIST: {
    ttl: 30 * 1000,
    storage: 'memory' as const,
  },
  
  // Lab details: 5 minutes in localStorage
  LAB_DETAILS: {
    ttl: 5 * 60 * 1000,
    storage: 'localStorage' as const,
  },
  
  // Notifications: 10 seconds in memory
  NOTIFICATIONS: {
    ttl: 10 * 1000,
    storage: 'memory' as const,
  },
  
  // Static data (restoration types, etc): 1 hour in localStorage
  STATIC_DATA: {
    ttl: 60 * 60 * 1000,
    storage: 'localStorage' as const,
  },
  
  // Chat messages: 1 minute in memory
  CHAT_MESSAGES: {
    ttl: 60 * 1000,
    storage: 'memory' as const,
  },
  
  // Large datasets: IndexedDB with 10 minute TTL
  LARGE_DATASETS: {
    ttl: 10 * 60 * 1000,
    storage: 'indexedDB' as const,
  },
};
