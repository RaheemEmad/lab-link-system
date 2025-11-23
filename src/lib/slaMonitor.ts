/**
 * SLA (Service Level Agreement) Monitoring
 * Tracks performance metrics and alerts admins when thresholds are breached
 */

import { supabase } from "@/integrations/supabase/client";

export interface SLAThresholds {
  // Response time thresholds (milliseconds)
  responseTime: {
    warning: number;
    critical: number;
  };
  // Error rate thresholds (percentage)
  errorRate: {
    warning: number;
    critical: number;
  };
  // Query time thresholds (milliseconds)
  queryTime: {
    warning: number;
    critical: number;
  };
  // Memory usage thresholds (percentage)
  memoryUsage: {
    warning: number;
    critical: number;
  };
}

export const DEFAULT_SLA_THRESHOLDS: SLAThresholds = {
  responseTime: {
    warning: 1000,    // 1 second
    critical: 3000,   // 3 seconds
  },
  errorRate: {
    warning: 5,       // 5% error rate
    critical: 10,     // 10% error rate
  },
  queryTime: {
    warning: 500,     // 500ms
    critical: 2000,   // 2 seconds
  },
  memoryUsage: {
    warning: 75,      // 75% memory usage
    critical: 90,     // 90% memory usage
  },
};

interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

class SLAMonitor {
  private thresholds: SLAThresholds = DEFAULT_SLA_THRESHOLDS;
  private alertCooldowns: Map<string, number> = new Map();
  private readonly cooldownPeriod = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if we should send an alert (respects cooldown)
   */
  private shouldAlert(metricKey: string): boolean {
    const lastAlert = this.alertCooldowns.get(metricKey);
    if (!lastAlert) return true;
    
    const timeSinceLastAlert = Date.now() - lastAlert;
    return timeSinceLastAlert > this.cooldownPeriod;
  }

  /**
   * Create an admin notification
   */
  private async createAlert(metric: PerformanceMetric) {
    const metricKey = `${metric.name}_${metric.severity}`;
    
    if (!this.shouldAlert(metricKey)) {
      console.log(`Alert cooldown active for ${metricKey}`);
      return;
    }

    try {
      await supabase.rpc('create_admin_notification', {
        title_param: `SLA Threshold Breach: ${metric.name}`,
        message_param: `${metric.name} is at ${metric.value.toFixed(2)} (threshold: ${metric.threshold})`,
        severity_param: metric.severity === 'critical' ? 'critical' : 'warning',
        category_param: 'performance',
        metadata_param: {
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold,
          severity: metric.severity,
          timestamp: metric.timestamp.toISOString()
        }
      });

      this.alertCooldowns.set(metricKey, Date.now());
      console.log(`SLA alert sent: ${metric.name} - ${metric.severity}`);
    } catch (error) {
      console.error('Failed to create SLA alert:', error);
    }
  }

  /**
   * Check response time against thresholds
   */
  checkResponseTime(duration: number) {
    if (duration > this.thresholds.responseTime.critical) {
      this.createAlert({
        name: 'Response Time',
        value: duration,
        threshold: this.thresholds.responseTime.critical,
        severity: 'critical',
        timestamp: new Date()
      });
    } else if (duration > this.thresholds.responseTime.warning) {
      this.createAlert({
        name: 'Response Time',
        value: duration,
        threshold: this.thresholds.responseTime.warning,
        severity: 'warning',
        timestamp: new Date()
      });
    }
  }

  /**
   * Check error rate against thresholds
   */
  checkErrorRate(errorCount: number, totalCount: number) {
    if (totalCount === 0) return;
    
    const errorRate = (errorCount / totalCount) * 100;

    if (errorRate > this.thresholds.errorRate.critical) {
      this.createAlert({
        name: 'Error Rate',
        value: errorRate,
        threshold: this.thresholds.errorRate.critical,
        severity: 'critical',
        timestamp: new Date()
      });
    } else if (errorRate > this.thresholds.errorRate.warning) {
      this.createAlert({
        name: 'Error Rate',
        value: errorRate,
        threshold: this.thresholds.errorRate.warning,
        severity: 'warning',
        timestamp: new Date()
      });
    }
  }

  /**
   * Check database query time against thresholds
   */
  checkQueryTime(duration: number, queryName: string) {
    if (duration > this.thresholds.queryTime.critical) {
      this.createAlert({
        name: `Query Time: ${queryName}`,
        value: duration,
        threshold: this.thresholds.queryTime.critical,
        severity: 'critical',
        timestamp: new Date()
      });
    } else if (duration > this.thresholds.queryTime.warning) {
      this.createAlert({
        name: `Query Time: ${queryName}`,
        value: duration,
        threshold: this.thresholds.queryTime.warning,
        severity: 'warning',
        timestamp: new Date()
      });
    }
  }

  /**
   * Check memory usage against thresholds
   */
  checkMemoryUsage(percentUsed: number) {
    if (percentUsed > this.thresholds.memoryUsage.critical) {
      this.createAlert({
        name: 'Memory Usage',
        value: percentUsed,
        threshold: this.thresholds.memoryUsage.critical,
        severity: 'critical',
        timestamp: new Date()
      });
    } else if (percentUsed > this.thresholds.memoryUsage.warning) {
      this.createAlert({
        name: 'Memory Usage',
        value: percentUsed,
        threshold: this.thresholds.memoryUsage.warning,
        severity: 'warning',
        timestamp: new Date()
      });
    }
  }

  /**
   * Update SLA thresholds
   */
  updateThresholds(newThresholds: Partial<SLAThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): SLAThresholds {
    return { ...this.thresholds };
  }

  /**
   * Clear alert cooldowns (for testing)
   */
  clearCooldowns() {
    this.alertCooldowns.clear();
  }
}

// Export singleton instance
export const slaMonitor = new SLAMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__slaMonitor = slaMonitor;
}
