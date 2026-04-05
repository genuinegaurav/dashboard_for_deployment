import { Module } from '@nestjs/common';

import { FinancialRecordsCommandService } from './financial-records-command.service';
import { FinancialRecordsController } from './financial-records.controller';
import { FinancialRecordsQueryService } from './financial-records-query.service';
import { FinancialRecordsRepository } from './financial-records.repository';

@Module({
  controllers: [FinancialRecordsController],
  providers: [
    FinancialRecordsRepository,
    FinancialRecordsQueryService,
    FinancialRecordsCommandService,
  ],
  exports: [
    FinancialRecordsRepository,
    FinancialRecordsQueryService,
    FinancialRecordsCommandService,
  ],
})
export class FinancialRecordsModule {}
