Plan: Security Hardening Analysis & Recommendations
This Gmail client has decent foundational security (Supabase auth, OAuth, route guards) but has several vulnerabilities—most critically wildcard CORS, custom HTML sanitization without DOMPurify, disabled security features, and client-side-only protections. Current Security Grade: 5.5/10

Critical Vulnerabilities Found
Wildcard CORS (*) in Supabase edge functions allows any origin to call your backend APIs
Custom HTML sanitization instead of DOMPurify in IsolatedEmailContent.tsx risks XSS bypasses
All security features disabled in security.ts:11-16 (ENFORCE_USER_WHITELIST: false, DevTools protections off)
Sensitive data in localStorage (user email, tokens) vulnerable to XSS extraction
Overly broad OAuth scopes requesting full Gmail/Drive/Calendar access when less may suffice
Medium-Severity Issues
No rate limiting on login attempts at AuthContext.tsx
No Content Security Policy (CSP) headers configured
Client-side only route protection—no server middleware validates sessions
No audit logging to server—security events only logged to browser console
Iframe sandbox allows scripts in some email rendering components
Steps to Improve Security
Replace custom sanitization with DOMPurify in IsolatedEmailContent.tsx and all dangerouslySetInnerHTML usages—prevents XSS edge-case bypasses
Restrict CORS origins in Supabase functions to your specific domain(s) instead of Access-Control-Allow-Origin: "*"
Enable security features in security.ts—set ENFORCE_USER_WHITELIST, DISABLE_DEVTOOLS_IN_PROD, and SANITIZE_LOGS_IN_PROD to true
Add rate limiting to login flow using a counter with exponential backoff after failed attempts
Implement CSP headers in netlify.toml or via meta tags to restrict script sources and prevent inline execution
Move sensitive tokens to httpOnly cookies where possible, or use sessionStorage instead of localStorage for session data
Further Considerations
Server-side session validation: Currently all route guards are client-side React components. Should Supabase Row Level Security (RLS) be verified for all database operations?
OAuth scope reduction: The app requests https://mail.google.com/ (full access). Would narrower scopes like gmail.modify suffice for your use cases?
Audit logging: Security events only go to console.log. Would you like a plan for server-side audit trail storage in Supabase?