/**
 * State synchronization utility for maintaining consistency across tabs/browsers
 * Uses BroadcastChannel API and localStorage for cross-tab communication
 */

type StateUpdateHandler = (data: any) => void;

interface SyncMessage {
  type: 'state_update' | 'invalidate_cache' | 'force_refresh';
  key: string;
  data?: any;
  timestamp: number;
  tabId: string;
}

class StateSyncManager {
  private channel: BroadcastChannel | null = null;
  private handlers: Map<string, Set<StateUpdateHandler>> = new Map();
  private tabId: string;
  private isSupported: boolean;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isSupported = typeof BroadcastChannel !== 'undefined';

    if (this.isSupported) {
      this.channel = new BroadcastChannel('lablink_state_sync');
      this.channel.onmessage = this.handleMessage.bind(this);
    }

    // Also listen to storage events for fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }

    // Log tab ID for debugging
    console.log(`🔗 State sync initialized for ${this.tabId}`);
  }

  /**
   * Subscribe to state updates for a specific key
   */
  subscribe(key: string, handler: StateUpdateHandler) {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(key)?.delete(handler);
    };
  }

  /**
   * Broadcast a state update to all tabs
   */
  broadcast(key: string, data: any) {
    const message: SyncMessage = {
      type: 'state_update',
      key,
      data,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }

    // Also store in localStorage as fallback
    this.storeInLocalStorage(key, data);
  }

  /**
   * Invalidate cache across all tabs
   */
  invalidateCache(key: string) {
    const message: SyncMessage = {
      type: 'invalidate_cache',
      key,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }

    // Trigger handlers in current tab
    this.notifyHandlers(key, null);
  }

  /**
   * Force refresh across all tabs
   */
  forceRefresh(key: string) {
    const message: SyncMessage = {
      type: 'force_refresh',
      key,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }

    // Trigger handlers in current tab
    this.notifyHandlers(key, { forceRefresh: true });
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(event: MessageEvent<SyncMessage>) {
    const { type, key, data, tabId } = event.data;

    // Ignore messages from self
    if (tabId === this.tabId) return;

    console.log(`📨 Received ${type} for ${key} from ${tabId}`);

    switch (type) {
      case 'state_update':
        this.notifyHandlers(key, data);
        break;
      case 'invalidate_cache':
        this.notifyHandlers(key, null);
        break;
      case 'force_refresh':
        this.notifyHandlers(key, { forceRefresh: true });
        break;
    }
  }

  /**
   * Handle storage events (fallback for browsers without BroadcastChannel)
   */
  private handleStorageEvent(event: StorageEvent) {
    if (event.key?.startsWith('lablink_sync_')) {
      const key = event.key.replace('lablink_sync_', '');
      const data = event.newValue ? JSON.parse(event.newValue) : null;
      this.notifyHandlers(key, data);
    }
  }

  /**
   * Notify all handlers for a specific key
   */
  private notifyHandlers(key: string, data: any) {
    const handlers = this.handlers.get(key);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in state sync handler for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Store data in localStorage as fallback
   */
  private storeInLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(`lablink_sync_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        tabId: this.tabId,
      }));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  /**
   * Get data from localStorage
   */
  getFromLocalStorage(key: string): any | null {
    try {
      const stored = localStorage.getItem(`lablink_sync_${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        // Only return if data is less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }
    return null;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    this.handlers.clear();
  }
}

// Export singleton instance
export const stateSync = new StateSyncManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stateSync.destroy();
  });
}
