// Security utilities
import { SECURITY_CONFIG } from '../config/security';

/**
 * Disable developer tools and console access in production
 */
export const initSecurityMeasures = () => {
  // Check if we're in production (fallback if env vars not available)
  const isProduction = import.meta.env?.PROD || window.location.hostname !== 'localhost';
  
  if (isProduction) {
    
    if (SECURITY_CONFIG.FEATURES.DISABLE_RIGHT_CLICK_IN_PROD) {
      // Disable right-click context menu
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });
    }

    if (SECURITY_CONFIG.FEATURES.DISABLE_DEVTOOLS_IN_PROD) {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+I (Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+C (Select Element)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          return false;
        }
      });
    }

    if (SECURITY_CONFIG.FEATURES.DISABLE_CONSOLE_IN_PROD) {
      // Override console methods to prevent information leakage
      const noop = () => {};
      if (window.console) {
        window.console.log = noop;
        window.console.warn = noop;
        window.console.error = noop;
        window.console.info = noop;
        window.console.debug = noop;
        window.console.trace = noop;
      }
    }

    if (SECURITY_CONFIG.FEATURES.DISABLE_DEVTOOLS_IN_PROD) {
      // Detect developer tools opening
      let devtools = {
        open: false,
        orientation: null as string | null
      };
      
      const threshold = 160;
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            console.clear();
            // Redirect to a warning page or logout
            window.location.href = '/auth';
          }
        } else {
          devtools.open = false;
        }
      }, 500);
    }
  }
};

/**
 * Sanitize sensitive data for logging
 */
export const sanitizeForLog = (data: any): any => {
  if (import.meta.env.PROD && SECURITY_CONFIG.FEATURES.SANITIZE_LOGS_IN_PROD) {
    return '[REDACTED]';
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'email', 'apiKey'];
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * Check if user is authorized
 */
export const isAuthorizedUser = (email: string): boolean => {
  if (!SECURITY_CONFIG.FEATURES.ENFORCE_USER_WHITELIST) {
    return true;
  }
  
  return SECURITY_CONFIG.ALLOWED_USERS.includes(email.toLowerCase().trim());
};

/**
 * Secure fetch wrapper that sanitizes requests in production
 */
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Check if we're in production (fallback if env vars not available)
  const isProduction = import.meta.env?.PROD || window.location.hostname !== 'localhost';
  
  // In production, sanitize headers to prevent token leakage in network tabs
  if (isProduction && options.headers) {
    const headers = new Headers(options.headers);
    
    // Log sanitized version for debugging
    const sanitizedHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('token')) {
        sanitizedHeaders[key] = '[REDACTED]';
      } else {
        sanitizedHeaders[key] = value;
      }
    });
  }
  
  return fetch(url, options);
};
