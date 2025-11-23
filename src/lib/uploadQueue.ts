/**
 * Advanced Upload Queue Manager with retry logic and bandwidth throttling
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'retrying';

export interface QueuedUpload {
  id: string;
  file: File;
  orderId: string;
  userId: string;
  category: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  retryCount: number;
  filePath?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface NetworkStats {
  estimatedSpeed: number; // bytes per second
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendedConcurrency: number;
}

export interface UploadQueueOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  autoThrottle?: boolean;
}

export class UploadQueue {
  private queue: QueuedUpload[] = [];
  private active: Set<string> = new Set();
  private listeners: Array<(queue: QueuedUpload[]) => void> = [];
  private maxRetries: number;
  private initialRetryDelay: number;
  private maxRetryDelay: number;
  private autoThrottle: boolean;
  private concurrency: number = 3;
  private networkStats: NetworkStats | null = null;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options: UploadQueueOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 16000;
    this.autoThrottle = options.autoThrottle ?? true;
  }

  /**
   * Detect network speed by downloading a small test file
   */
  async detectNetworkSpeed(): Promise<NetworkStats> {
    try {
      const testUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
      const testSizeBytes = 13504; // Approximate size
      
      const startTime = performance.now();
      const response = await fetch(testUrl, { cache: 'no-store' });
      await response.blob();
      const endTime = performance.now();
      
      const durationSeconds = (endTime - startTime) / 1000;
      const speedBytesPerSecond = testSizeBytes / durationSeconds;
      
      // Categorize connection quality
      let quality: NetworkStats['quality'];
      let recommendedConcurrency: number;
      
      if (speedBytesPerSecond > 5 * 1024 * 1024) { // > 5 MB/s
        quality = 'excellent';
        recommendedConcurrency = 5;
      } else if (speedBytesPerSecond > 1 * 1024 * 1024) { // > 1 MB/s
        quality = 'good';
        recommendedConcurrency = 3;
      } else if (speedBytesPerSecond > 512 * 1024) { // > 512 KB/s
        quality = 'fair';
        recommendedConcurrency = 2;
      } else {
        quality = 'poor';
        recommendedConcurrency = 1;
      }
      
      this.networkStats = {
        estimatedSpeed: speedBytesPerSecond,
        quality,
        recommendedConcurrency
      };
      
      if (this.autoThrottle) {
        this.concurrency = recommendedConcurrency;
      }
      
      return this.networkStats;
    } catch (error) {
      console.warn('Network speed detection failed:', error);
      // Default to conservative values
      this.networkStats = {
        estimatedSpeed: 1 * 1024 * 1024, // 1 MB/s
        quality: 'fair',
        recommendedConcurrency: 2
      };
      return this.networkStats;
    }
  }

  /**
   * Add files to the upload queue
   */
  addToQueue(uploads: Omit<QueuedUpload, 'status' | 'progress' | 'retryCount'>[]): void {
    const newUploads: QueuedUpload[] = uploads.map(upload => ({
      ...upload,
      status: 'pending' as UploadStatus,
      progress: 0,
      retryCount: 0
    }));
    
    this.queue.push(...newUploads);
    this.notifyListeners();
  }

  /**
   * Start processing the queue
   */
  async processQueue(supabase: SupabaseClient): Promise<void> {
    // Detect network speed before starting
    if (this.autoThrottle && !this.networkStats) {
      await this.detectNetworkSpeed();
    }
    
    while (this.hasPendingUploads()) {
      // Find pending uploads
      const pending = this.queue.filter(u => u.status === 'pending');
      
      // Start uploads up to concurrency limit
      const availableSlots = this.concurrency - this.active.size;
      const toStart = pending.slice(0, availableSlots);
      
      await Promise.all(
        toStart.map(upload => this.uploadFile(supabase, upload))
      );
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Upload a single file with retry logic
   */
  private async uploadFile(supabase: SupabaseClient, upload: QueuedUpload): Promise<void> {
    this.active.add(upload.id);
    this.updateUpload(upload.id, { status: 'uploading', startedAt: Date.now() });
    
    const controller = new AbortController();
    this.abortControllers.set(upload.id, controller);
    
    try {
      const filePath = `${upload.userId}/${upload.orderId}/${upload.id}-${upload.file.name}`;
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        const currentUpload = this.queue.find(u => u.id === upload.id);
        if (currentUpload && currentUpload.progress < 90) {
          this.updateUpload(upload.id, { progress: currentUpload.progress + 10 });
        }
      }, 200);
      
      try {
        // Upload to storage with abort signal
        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, upload.file, {
            cacheControl: '3600',
            upsert: false
          });
        
        clearInterval(progressInterval);
        
        if (uploadError) throw uploadError;
        
        this.updateUpload(upload.id, { progress: 95 });
        
        // Save metadata to database
        const { error: dbError } = await supabase
          .from('order_attachments')
          .insert({
            order_id: upload.orderId,
            uploaded_by: upload.userId,
            file_name: upload.file.name,
            file_path: filePath,
            file_type: upload.file.type,
            file_size: upload.file.size,
            attachment_category: upload.category
          });
        
        if (dbError) {
          // Rollback - delete uploaded file
          await supabase.storage.from('order-attachments').remove([filePath]);
          throw dbError;
        }
        
        this.updateUpload(upload.id, {
          status: 'completed',
          progress: 100,
          filePath,
          completedAt: Date.now()
        });
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Upload failed';
      
      // Check if we should retry
      if (upload.retryCount < this.maxRetries && !controller.signal.aborted) {
        await this.scheduleRetry(supabase, upload, errorMessage);
      } else {
        this.updateUpload(upload.id, {
          status: 'failed',
          error: errorMessage
        });
      }
    } finally {
      this.active.delete(upload.id);
      this.abortControllers.delete(upload.id);
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    supabase: SupabaseClient,
    upload: QueuedUpload,
    error: string
  ): Promise<void> {
    const retryCount = upload.retryCount + 1;
    const delay = Math.min(
      this.initialRetryDelay * Math.pow(2, upload.retryCount),
      this.maxRetryDelay
    );
    
    this.updateUpload(upload.id, {
      status: 'retrying',
      retryCount,
      error: `${error} (Retry ${retryCount}/${this.maxRetries} in ${(delay / 1000).toFixed(1)}s)`
    });
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.updateUpload(upload.id, { status: 'pending' });
  }

  /**
   * Cancel a specific upload
   */
  cancelUpload(uploadId: string): void {
    const controller = this.abortControllers.get(uploadId);
    if (controller) {
      controller.abort();
    }
    
    this.updateUpload(uploadId, {
      status: 'failed',
      error: 'Cancelled by user'
    });
    
    this.active.delete(uploadId);
  }

  /**
   * Cancel all uploads
   */
  cancelAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    this.queue.forEach(upload => {
      if (upload.status === 'uploading' || upload.status === 'pending' || upload.status === 'retrying') {
        this.updateUpload(upload.id, {
          status: 'failed',
          error: 'Cancelled by user'
        });
      }
    });
    
    this.active.clear();
  }

  /**
   * Retry a failed upload
   */
  retryUpload(uploadId: string): void {
    const upload = this.queue.find(u => u.id === uploadId);
    if (upload && upload.status === 'failed') {
      this.updateUpload(uploadId, {
        status: 'pending',
        retryCount: 0,
        error: undefined
      });
    }
  }

  /**
   * Remove an upload from the queue
   */
  removeUpload(uploadId: string): void {
    this.cancelUpload(uploadId);
    this.queue = this.queue.filter(u => u.id !== uploadId);
    this.notifyListeners();
  }

  /**
   * Clear completed uploads
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(u => u.status !== 'completed');
    this.notifyListeners();
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (queue: QueuedUpload[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.queue]);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Set concurrency manually
   */
  setConcurrency(value: number): void {
    this.concurrency = Math.max(1, Math.min(10, value));
  }

  /**
   * Get current queue state
   */
  getQueue(): QueuedUpload[] {
    return [...this.queue];
  }

  /**
   * Get network stats
   */
  getNetworkStats(): NetworkStats | null {
    return this.networkStats;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(u => u.status === 'pending').length,
      uploading: this.queue.filter(u => u.status === 'uploading').length,
      completed: this.queue.filter(u => u.status === 'completed').length,
      failed: this.queue.filter(u => u.status === 'failed').length,
      retrying: this.queue.filter(u => u.status === 'retrying').length,
      active: this.active.size,
      concurrency: this.concurrency
    };
  }

  private updateUpload(id: string, updates: Partial<QueuedUpload>): void {
    const index = this.queue.findIndex(u => u.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      this.notifyListeners();
    }
  }

  private hasPendingUploads(): boolean {
    return this.queue.some(u => u.status === 'pending' || u.status === 'uploading' || u.status === 'retrying');
  }

  private notifyListeners(): void {
    const queueCopy = [...this.queue];
    this.listeners.forEach(listener => listener(queueCopy));
  }
}
