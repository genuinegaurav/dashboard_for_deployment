import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { DATE_ONLY_REGEX } from '../../common/constants/validation.constants';
import { RecordType } from '../../common/enums/record-type.enum';
import { RecordSortBy } from '../../common/enums/record-sort-by.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

export class QueryFinancialRecordsDto {
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

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: RecordSortBy, enumName: 'RecordSortBy' })
  @IsOptional()
  @IsEnum(RecordSortBy)
  sortBy?: RecordSortBy;

  @ApiPropertyOptional({ enum: SortOrder, enumName: 'SortOrder' })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
