export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}
