// Development logging utility
const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = {
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    console.error(message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  }
};

export const securityLog = {
  block: (message: string) => {
    if (isDevelopment) {
      console.log(`🔒 ${message}`);
    }
  },
  init: (service: string) => {
    if (isDevelopment) {
      console.log(`🔧 ${service} initialized`);
    }
  }
};
