import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum AuthResponseMode {
  COOKIE = 'cookie',
  BEARER = 'bearer',
}

export class LoginQueryDto {
  @ApiPropertyOptional({
    enum: AuthResponseMode,
    default: AuthResponseMode.COOKIE,
    description:
      'Use "bearer" only for explicit development or testing flows that need the raw access token.',
  })
  @IsOptional()
  @IsEnum(AuthResponseMode)
  responseMode?: AuthResponseMode;
}
