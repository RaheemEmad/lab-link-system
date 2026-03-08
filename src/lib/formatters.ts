/**
 * Shared formatting utilities — single source of truth.
 * Import from here instead of defining inline helpers.
 */

/**
 * Format a number as Egyptian Pound (EGP) currency string.
 * @param amount - Numeric amount
 * @param decimals - Number of decimal places (default 0)
 */
export const formatEGP = (amount: number, decimals: number = 0): string => {
  return `EGP ${amount.toLocaleString('en-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Count teeth from FDI notation string (comma-separated).
 * @param teethNumber - e.g. "11,12,21"
 */
export const countTeeth = (teethNumber: string): number => {
  if (!teethNumber) return 0;
  return teethNumber.split(',').filter(t => t.trim()).length;
};
