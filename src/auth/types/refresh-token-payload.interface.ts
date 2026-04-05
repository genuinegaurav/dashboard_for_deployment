export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
