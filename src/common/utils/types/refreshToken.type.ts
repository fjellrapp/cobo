export type RefreshToken = {
  expires: Date;
  userId: number;
  isRevoked: boolean;
  iat?: number;
  exp?: number;
};
