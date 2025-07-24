export const SECURITY_CONFIG = {
  ALLOWED_USERS: [
    'martisuvorov@outlook.com',
    'martisuvorov12@gmail.com',
    'david.v@dnddesigncenter.com',
    'natalia.landa2615@gmail.com',
    'info@dnddesigncenter.com',
  ],
  
  FEATURES: {
    DISABLE_CONSOLE_IN_PROD: false,
    DISABLE_DEVTOOLS_IN_PROD: false,
    DISABLE_RIGHT_CLICK_IN_PROD: false,
    SANITIZE_LOGS_IN_PROD: false,
    ENFORCE_USER_WHITELIST: false,
    REQUIRE_INITIAL_AUTH: false, // Temporarily disable to test navigation
  },
};

export default SECURITY_CONFIG;
