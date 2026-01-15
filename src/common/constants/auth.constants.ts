export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    STAFF: {
      name: 'staffRefreshToken',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
        domain: new URL(process.env.FRONTEND_URL!).hostname,
      },
    },
    CUSTOMER: {
      name: 'customerRefreshToken',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
        domain: new URL(process.env.CUSTOMER_FRONTEND_URL!).hostname,
      },
    },
  },
} as const;

export const TOKEN_CONFIG = {
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  ACCESS_TOKEN_EXPIRY: '5m',
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 1,
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  ADMIN: 'admin',
  WAITER: 'waiter',
  KITCHEN: 'kitchen_staff',
  CUSTOMER: 'customer',
  GUEST: 'guest',
} as const;

export const ACCOUNT_TYPES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
} as const;
