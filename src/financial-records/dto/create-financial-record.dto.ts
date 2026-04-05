import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateFinancialRecordDto {
  @ApiProperty({ example: 4500.75 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: RecordType, enumName: 'RecordType' })
  @IsEnum(RecordType)
  type!: RecordType;

  @ApiProperty({ example: 'rent' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: '2026-04-01' })
  @Matches(DATE_ONLY_REGEX, {
    message: 'recordDate must match YYYY-MM-DD',
  })
  recordDate!: string;

  @ApiPropertyOptional({ example: 'Monthly apartment rent' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500)
  notes?: string;
}
