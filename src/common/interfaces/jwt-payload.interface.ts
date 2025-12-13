export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}
