/**
 * Comprehensive order validation utilities
 * Handles edge cases, missing details, and duplicate detection
 */

import { supabase } from '@/integrations/supabase/client';

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface OrderData {
  patient_name: string;
  restoration_type: string;
  teeth_number: string;
  teeth_shade: string;
  doctor_name?: string;
  urgency?: string;
  biological_notes?: string;
  desired_delivery_date?: string;
}

/**
 * Validate order data comprehensively
 */
export async function validateOrder(
  orderData: Partial<OrderData>,
  userId?: string
): Promise<OrderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required field validation
  if (!orderData.patient_name || orderData.patient_name.trim().length === 0) {
    errors.push('Patient name is required');
  } else if (orderData.patient_name.trim().length < 2) {
    errors.push('Patient name must be at least 2 characters');
  }

  if (!orderData.restoration_type) {
    errors.push('Restoration type is required');
  }

  if (!orderData.teeth_number || orderData.teeth_number.trim().length === 0) {
    errors.push('Teeth number is required');
  } else {
    // Validate teeth number format
    const validationResult = validateTeethNumber(orderData.teeth_number);
    if (!validationResult.isValid) {
      errors.push(validationResult.error!);
    }
  }

  if (!orderData.teeth_shade || orderData.teeth_shade.trim().length === 0) {
    errors.push('Teeth shade is required');
  }

  // Check for missing optional but recommended fields
  if (!orderData.biological_notes || orderData.biological_notes.trim().length === 0) {
    warnings.push('Adding biological notes helps labs deliver better results');
    suggestions.push('Consider adding preparation details, margin type, or any special requirements');
  }

  if (!orderData.desired_delivery_date) {
    warnings.push('No delivery date specified');
    suggestions.push('Setting a desired delivery date helps labs prioritize your order');
  }

  // Check for duplicate orders (same patient + restoration type in last 24 hours)
  if (userId && orderData.patient_name && orderData.restoration_type) {
    const duplicateResult = await checkDuplicateOrder(
      userId,
      orderData.patient_name,
      orderData.restoration_type,
      orderData.teeth_number || ''
    );

    if (duplicateResult.isDuplicate) {
      warnings.push(`Similar order found: ${duplicateResult.orderNumber}`);
      suggestions.push('Please verify this is not a duplicate order. If intentional, proceed.');
    }
  }

  // Validate delivery date is in the future
  if (orderData.desired_delivery_date) {
    const deliveryDate = new Date(orderData.desired_delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deliveryDate < today) {
      errors.push('Delivery date must be in the future');
    } else {
      const daysUntilDelivery = Math.ceil(
        (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDelivery < 3 && orderData.urgency !== 'Urgent') {
        warnings.push('Delivery date is less than 3 days away');
        suggestions.push('Consider marking this order as Urgent for faster processing');
      }

      if (daysUntilDelivery < 2) {
        warnings.push('Very tight timeline - may require urgent processing fees');
      }
    }
  }

  // Urgency validation
  if (orderData.urgency === 'Urgent') {
    if (!orderData.biological_notes || orderData.biological_notes.length < 10) {
      warnings.push('Urgent orders should include detailed notes');
      suggestions.push('Add specific requirements to ensure fast and accurate processing');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate teeth number format
 * Accepts: single tooth (e.g., "11"), ranges (e.g., "11-14"), comma-separated (e.g., "11,12,21")
 */
function validateTeethNumber(teethNumber: string): { isValid: boolean; error?: string } {
  const trimmed = teethNumber.trim();

  // Check for empty
  if (!trimmed) {
    return { isValid: false, error: 'Teeth number cannot be empty' };
  }

  // Split by comma for multiple teeth
  const parts = trimmed.split(',').map(p => p.trim());

  for (const part of parts) {
    // Check for range (e.g., "11-14")
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(p => parseInt(p.trim()));
      if (isNaN(start) || isNaN(end)) {
        return { isValid: false, error: 'Invalid range format. Use format: 11-14' };
      }
      if (start < 1 || start > 48 || end < 1 || end > 48) {
        return { isValid: false, error: 'Tooth numbers must be between 1 and 48' };
      }
      if (start >= end) {
        return { isValid: false, error: 'Range start must be less than end' };
      }
    } else {
      // Single tooth number
      const toothNum = parseInt(part);
      if (isNaN(toothNum)) {
        return { isValid: false, error: 'Tooth number must be numeric' };
      }
      if (toothNum < 1 || toothNum > 48) {
        return { isValid: false, error: 'Tooth numbers must be between 1 and 48' };
      }
    }
  }

  return { isValid: true };
}

/**
 * Check for duplicate orders
 */
async function checkDuplicateOrder(
  userId: string,
  patientName: string,
  restorationType: string,
  teethNumber: string
): Promise<{ isDuplicate: boolean; orderNumber?: string }> {
  try {
    // Check for similar orders in last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('orders')
      .select('order_number, created_at')
      .eq('doctor_id', userId)
      .ilike('patient_name', patientName)
      .eq('teeth_number', teethNumber)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking duplicates:', error);
      return { isDuplicate: false };
    }

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        orderNumber: data[0].order_number,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error in checkDuplicateOrder:', error);
    return { isDuplicate: false };
  }
}

/**
 * Sanitize and normalize order data
 */
export function sanitizeOrderData(orderData: Partial<OrderData>): Partial<OrderData> {
  return {
    ...orderData,
    patient_name: orderData.patient_name?.trim(),
    teeth_number: orderData.teeth_number?.trim().replace(/\s+/g, ''),
    teeth_shade: orderData.teeth_shade?.trim(),
    biological_notes: orderData.biological_notes?.trim(),
  };
}
