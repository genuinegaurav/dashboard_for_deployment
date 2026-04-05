import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { DATE_ONLY_REGEX } from '../../common/constants/validation.constants';
import { RecordType } from '../../common/enums/record-type.enum';
import { TrendGranularity } from '../../common/enums/trend-granularity.enum';

export class DashboardFiltersDto {
  @ApiPropertyOptional({ enum: RecordType, enumName: 'RecordType' })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ example: 'salary' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, {
    message: 'startDate must match YYYY-MM-DD',
  })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, {
    message: 'endDate must match YYYY-MM-DD',
  })
  endDate?: string;

  @ApiPropertyOptional({ enum: TrendGranularity, enumName: 'TrendGranularity' })
  @IsOptional()
  @IsEnum(TrendGranularity)
  granularity?: TrendGranularity;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
