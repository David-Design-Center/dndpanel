/**
 * Security logging utilities for password reset flow
 */

export const logSecurityEvent = (event: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;
  
  console.log(`🔐 SECURITY EVENT [${timestamp}]: ${event}`, {
    url,
    userAgent: userAgent.substring(0, 100), // Truncate for readability
    details
  });
};

export const logPasswordResetAttempt = (success: boolean, userEmail?: string, error?: string) => {
  logSecurityEvent('PASSWORD_RESET_ATTEMPT', {
    success,
    userEmail: userEmail ? `${userEmail.substring(0, 3)}***@${userEmail.split('@')[1]}` : 'unknown',
    error: error ? error.substring(0, 100) : undefined
  });
};

export const logUnauthorizedAccess = (attemptedPath: string) => {
  logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
    attemptedPath,
    referrer: document.referrer
  });
};
