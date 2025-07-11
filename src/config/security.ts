// Security Configuration
// Update this file to manage access control and authentication

export const SECURITY_CONFIG = {
  ALLOWED_USERS: [
    'martisuvorov@outlook.com',
    'martisuvorov12@gmail.com',
    'david.v@dnddesigncenter.com',
    'natalia.landa2615@gmail.com',
    'info@dnddesigncenter.com',
  ],
  
  // Security features
  FEATURES: {
    DISABLE_CONSOLE_IN_PROD: true,
    DISABLE_DEVTOOLS_IN_PROD: false,
    DISABLE_RIGHT_CLICK_IN_PROD: false,
    SANITIZE_LOGS_IN_PROD: true,
    ENFORCE_USER_WHITELIST: true, // Temporarily disabled for testing
    REQUIRE_INITIAL_AUTH: true,
  },
  
  // Rate limiting (future enhancement)
  RATE_LIMITS: {
    LOGIN_ATTEMPTS_PER_HOUR: 5,
    API_CALLS_PER_MINUTE: 60,
  },
};

export default SECURITY_CONFIG;
