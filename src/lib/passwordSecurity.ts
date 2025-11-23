import { createHash } from 'crypto';

/**
 * Check if a password has been compromised in known data breaches
 * Uses the Have I Been Pwned API (k-Anonymity model)
 * @param password - The password to check
 * @returns true if password is compromised, false if safe
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  try {
    // Create SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = hashHex.toUpperCase();
    
    // Use k-Anonymity model: send only first 5 chars of hash
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    // Query Have I Been Pwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    
    if (!response.ok) {
      console.error('Failed to check password against breach database');
      return false; // Fail open - don't block signup if API is down
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our hash suffix appears in the results
    for (const line of hashes) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        console.warn(`Password found in ${count.trim()} breaches`);
        return true; // Password is compromised
      }
    }
    
    return false; // Password is safe
  } catch (error) {
    console.error('Error checking password security:', error);
    return false; // Fail open on error
  }
}

/**
 * Validate password strength requirements
 * @param password - The password to validate
 * @returns validation result with errors if any
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
