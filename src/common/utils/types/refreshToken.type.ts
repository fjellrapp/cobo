export type RefreshToken = {
  userId: number;
  isRevoked: boolean;
  iat?: number;
  exp?: number;
  expires?: Date;
};
