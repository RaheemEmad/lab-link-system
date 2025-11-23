/**
 * Performance monitoring utilities for tracking latency, memory, and CPU usage
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100; // Keep last 100 metrics

  /**
   * Measure async operation performance
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, status: 'success' },
      });

      // Log slow operations (> 1s)
      if (duration > 1000) {
        console.warn(`⚠️ Slow operation: ${name} took ${Math.round(duration)}ms`, metadata);
        
        // Check against SLA thresholds
        if (typeof window !== 'undefined' && (window as any).__slaMonitor) {
          (window as any).__slaMonitor.checkResponseTime(duration);
        }
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, status: 'error', error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Measure sync operation performance
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - start;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, status: 'success' },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, status: 'error', error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Record a metric manually
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last N metrics to prevent memory leak
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics for a specific operation
   */
  getStats(name: string) {
    const operationMetrics = this.metrics.filter(m => m.name === name);
    
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const successful = operationMetrics.filter(m => m.metadata?.status === 'success').length;
    const failed = operationMetrics.filter(m => m.metadata?.status === 'error').length;

    return {
      count: operationMetrics.length,
      successful,
      failed,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return [...this.metrics];
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        percentUsed: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      };
    }
    return null;
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const uniqueOperations = [...new Set(this.metrics.map(m => m.name))];
    
    console.group('📊 Performance Summary');
    
    uniqueOperations.forEach(name => {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`, {
          calls: stats.count,
          success: stats.successful,
          failed: stats.failed,
          avg: `${Math.round(stats.avgDuration)}ms`,
          p95: `${Math.round(stats.p95Duration)}ms`,
          max: `${Math.round(stats.maxDuration)}ms`,
        });
      }
    });

    const memory = this.getMemoryUsage();
    if (memory) {
      console.log('Memory:', {
        used: `${memory.usedJSHeapSize}MB`,
        total: `${memory.totalJSHeapSize}MB`,
        limit: `${memory.jsHeapSizeLimit}MB`,
        percentUsed: `${memory.percentUsed}%`,
      });
    }

    console.groupEnd();
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).__performanceMonitor = performanceMonitor;
}
