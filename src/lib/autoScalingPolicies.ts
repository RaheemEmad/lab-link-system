/**
 * Auto-scaling policies and recommendations
 * Detects when scaling is needed based on load metrics
 */

import { supabase } from "@/integrations/supabase/client";

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
}

export interface ScalingPolicy {
  name: string;
  condition: (metrics: ScalingMetrics) => boolean;
  recommendation: string;
  severity: 'info' | 'warning' | 'critical';
  action: 'scale_up' | 'scale_down' | 'optimize' | 'alert';
}

const SCALING_POLICIES: ScalingPolicy[] = [
  {
    name: 'High CPU Usage',
    condition: (m) => m.cpuUsage > 80,
    recommendation: 'CPU usage is critically high (>80%). Consider scaling up compute resources.',
    severity: 'critical',
    action: 'scale_up'
  },
  {
    name: 'High Memory Usage',
    condition: (m) => m.memoryUsage > 85,
    recommendation: 'Memory usage is critically high (>85%). Consider increasing memory allocation.',
    severity: 'critical',
    action: 'scale_up'
  },
  {
    name: 'High Connection Count',
    condition: (m) => m.activeConnections > 900,
    recommendation: 'Active connections approaching limit. Consider connection pooling or scaling database.',
    severity: 'warning',
    action: 'scale_up'
  },
  {
    name: 'High Request Rate',
    condition: (m) => m.requestRate > 1000,
    recommendation: 'Request rate is very high (>1000/min). Consider implementing caching or CDN.',
    severity: 'warning',
    action: 'optimize'
  },
  {
    name: 'Elevated Error Rate',
    condition: (m) => m.errorRate > 5,
    recommendation: 'Error rate above 5%. Investigate errors and consider scaling if resource-related.',
    severity: 'warning',
    action: 'alert'
  },
  {
    name: 'Slow Response Times',
    condition: (m) => m.responseTime > 2000,
    recommendation: 'Response times exceeding 2 seconds. Consider query optimization or caching.',
    severity: 'warning',
    action: 'optimize'
  },
  {
    name: 'Low Resource Utilization',
    condition: (m) => m.cpuUsage < 20 && m.memoryUsage < 30,
    recommendation: 'Resource utilization is low. Consider scaling down to reduce costs.',
    severity: 'info',
    action: 'scale_down'
  }
];

class AutoScalingManager {
  private lastAlerts: Map<string, number> = new Map();
  private readonly cooldownPeriod = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if we should send an alert (respects cooldown)
   */
  private shouldAlert(policyName: string): boolean {
    const lastAlert = this.lastAlerts.get(policyName);
    if (!lastAlert) return true;
    
    const timeSinceLastAlert = Date.now() - lastAlert;
    return timeSinceLastAlert > this.cooldownPeriod;
  }

  /**
   * Evaluate all scaling policies against current metrics
   */
  async evaluatePolicies(metrics: ScalingMetrics) {
    const triggeredPolicies = SCALING_POLICIES.filter(policy => 
      policy.condition(metrics)
    );

    for (const policy of triggeredPolicies) {
      if (this.shouldAlert(policy.name)) {
        await this.createScalingAlert(policy, metrics);
        this.lastAlerts.set(policy.name, Date.now());
      }
    }

    return triggeredPolicies;
  }

  /**
   * Create an admin notification for scaling recommendation
   */
  private async createScalingAlert(policy: ScalingPolicy, metrics: ScalingMetrics) {
    try {
      await supabase.rpc('create_admin_notification', {
        title_param: `Auto-Scaling: ${policy.name}`,
        message_param: policy.recommendation,
        severity_param: policy.severity,
        category_param: 'auto_scaling',
        metadata_param: {
          policy: policy.name,
          action: policy.action,
          metrics: {
            cpuUsage: metrics.cpuUsage,
            memoryUsage: metrics.memoryUsage,
            activeConnections: metrics.activeConnections,
            requestRate: metrics.requestRate,
            errorRate: metrics.errorRate,
            responseTime: metrics.responseTime
          },
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Auto-scaling alert sent: ${policy.name} - ${policy.action}`);
    } catch (error) {
      console.error('Failed to create auto-scaling alert:', error);
    }
  }

  /**
   * Simulate metrics from load test results
   */
  createMetricsFromLoadTest(results: {
    totalRequests: number;
    successful: number;
    failed: number;
    avgDuration: number;
    maxDuration: number;
  }): ScalingMetrics {
    const errorRate = (results.failed / results.totalRequests) * 100;
    const requestRate = results.totalRequests / 60; // requests per minute
    
    // Estimate resource usage based on performance
    const memoryEstimate = Math.min(95, 30 + (results.totalRequests / 10));
    const cpuEstimate = Math.min(95, 20 + (results.avgDuration / 20));

    return {
      cpuUsage: cpuEstimate,
      memoryUsage: memoryEstimate,
      activeConnections: Math.min(1000, results.totalRequests / 5),
      requestRate,
      errorRate,
      responseTime: results.avgDuration
    };
  }

  /**
   * Get scaling recommendations
   */
  getRecommendations(metrics: ScalingMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.cpuUsage > 70) {
      recommendations.push('Consider scaling up CPU resources or optimizing compute-intensive operations');
    }

    if (metrics.memoryUsage > 70) {
      recommendations.push('Consider increasing memory allocation or implementing better caching');
    }

    if (metrics.responseTime > 1000) {
      recommendations.push('Optimize database queries and implement query result caching');
    }

    if (metrics.errorRate > 3) {
      recommendations.push('Investigate error logs and implement better error handling');
    }

    if (metrics.activeConnections > 700) {
      recommendations.push('Implement connection pooling or increase connection limits');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Clear alert cooldowns (for testing)
   */
  clearCooldowns() {
    this.lastAlerts.clear();
  }
}

// Export singleton instance
export const autoScalingManager = new AutoScalingManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__autoScalingManager = autoScalingManager;
}
