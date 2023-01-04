export type RefreshToken = {
  userGuid: string;
  isRevoked: boolean;
  iat?: number;
  exp?: number;
  expires?: Date;
  refreshToken?: string;
};
