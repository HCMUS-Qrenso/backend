export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tenantId?: string;
  };
}
