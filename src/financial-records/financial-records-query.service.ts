import { Injectable, NotFoundException } from '@nestjs/common';

import { PaginatedResponse } from '../common/types/paginated-response.type';
import { QueryFinancialRecordsDto } from './dto/query-financial-records.dto';
import {
  buildRecordOrderBy,
  buildRecordWhereInput,
} from './financial-records.helpers';
import {
  FinancialRecordResponse,
  toFinancialRecordResponse,
} from './financial-records.serializer';
import { FinancialRecordsRepository } from './financial-records.repository';

@Injectable()
export class FinancialRecordsQueryService {
  constructor(
    private readonly financialRecordsRepository: FinancialRecordsRepository,
  ) {}

  async findAll(
    query: QueryFinancialRecordsDto,
  ): Promise<PaginatedResponse<FinancialRecordResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = buildRecordWhereInput(query);
    const [total, items] = await this.financialRecordsRepository.findPaginated(
      where,
      page,
      pageSize,
      buildRecordOrderBy(query.sortBy, query.sortOrder),
    );

    return {
      items: items.map(toFinancialRecordResponse),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: string): Promise<FinancialRecordResponse> {
    const record = await this.financialRecordsRepository.findActiveById(id);

    if (!record) {
      throw new NotFoundException('Financial record not found');
    }

    return toFinancialRecordResponse(record);
  }
}
