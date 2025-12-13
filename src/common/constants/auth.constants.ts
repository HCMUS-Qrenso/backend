export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    name: 'refreshToken',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    },
  },
} as const;

export const TOKEN_CONFIG = {
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  ACCESS_TOKEN_EXPIRY: '5m',
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 1,
} as const;
