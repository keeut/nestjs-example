import { ConfigService } from "@nestjs/config";

export const getJwtConfig = (configService: ConfigService) => ({
  secret: configService.get<string>('JWT_SECRET_KEY'),
  jwtExpiresIn: configService.get<string>('JWT_EXPIRES_IN', '30m'),
  jwtContents: ['idx', 'userId', 'idType', 'name'],
});
