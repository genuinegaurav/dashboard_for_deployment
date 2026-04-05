import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { DATE_ONLY_REGEX } from '../../common/constants/validation.constants';
import { RecordType } from '../../common/enums/record-type.enum';

export class UpdateFinancialRecordDto {
  @ApiPropertyOptional({ example: 4500.75 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: RecordType, enumName: 'RecordType' })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ example: 'groceries' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, {
    message: 'recordDate must match YYYY-MM-DD',
  })
  recordDate?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500)
  notes?: string;
}
