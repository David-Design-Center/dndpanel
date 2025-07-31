export const SECURITY_CONFIG = {
  ALLOWED_USERS: [
    'info@effidigi.com',
    'david.v@dnddesigncenter.com',
    'natalia@dnddesigncenter.com',
    'info@dnddesigncenter.com',
  ],
  
  FEATURES: {
    DISABLE_CONSOLE_IN_PROD: false,
    DISABLE_DEVTOOLS_IN_PROD: false,
    DISABLE_RIGHT_CLICK_IN_PROD: false,
    SANITIZE_LOGS_IN_PROD: false,
    ENFORCE_USER_WHITELIST: false, // Disabled - allow any authenticated user
    REQUIRE_INITIAL_AUTH: true, // Enabled - require users to login
  },
};

export default SECURITY_CONFIG;
