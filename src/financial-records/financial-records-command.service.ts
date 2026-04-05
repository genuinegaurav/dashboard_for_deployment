import { Injectable, NotFoundException } from '@nestjs/common';
import { RecordType as PrismaRecordType } from '@prisma/client';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFinancialRecordDto } from './dto/create-financial-record.dto';
import { UpdateFinancialRecordDto } from './dto/update-financial-record.dto';
import {
  amountToCents,
  normalizeCategory,
  normalizeNotes,
  parseDateOnly,
} from './financial-records.helpers';
import {
  FinancialRecordResponse,
  toFinancialRecordResponse,
} from './financial-records.serializer';
import { FinancialRecordsRepository } from './financial-records.repository';

@Injectable()
export class FinancialRecordsCommandService {
  constructor(
    private readonly financialRecordsRepository: FinancialRecordsRepository,
  ) {}

  async create(
    createFinancialRecordDto: CreateFinancialRecordDto,
    user: AuthenticatedUser,
  ): Promise<FinancialRecordResponse> {
    const record = await this.financialRecordsRepository.create({
      amountInCents: amountToCents(createFinancialRecordDto.amount),
      type: createFinancialRecordDto.type as PrismaRecordType,
      category: normalizeCategory(createFinancialRecordDto.category),
      recordDate: parseDateOnly(createFinancialRecordDto.recordDate),
      notes: normalizeNotes(createFinancialRecordDto.notes),
      createdByUserId: user.id,
    });

    return toFinancialRecordResponse(record);
  }

  async update(
    id: string,
    updateFinancialRecordDto: UpdateFinancialRecordDto,
    user: AuthenticatedUser,
  ): Promise<FinancialRecordResponse> {
    await this.ensureRecordExists(id);

    const data = {
      ...(updateFinancialRecordDto.amount !== undefined
        ? { amountInCents: amountToCents(updateFinancialRecordDto.amount) }
        : {}),
      ...(updateFinancialRecordDto.type
        ? { type: updateFinancialRecordDto.type as PrismaRecordType }
        : {}),
      ...(updateFinancialRecordDto.category
        ? { category: normalizeCategory(updateFinancialRecordDto.category) }
        : {}),
      ...(updateFinancialRecordDto.recordDate
        ? { recordDate: parseDateOnly(updateFinancialRecordDto.recordDate) }
        : {}),
      ...(updateFinancialRecordDto.notes !== undefined
        ? { notes: normalizeNotes(updateFinancialRecordDto.notes) }
        : {}),
      updatedByUserId: user.id,
    };

    const record = await this.financialRecordsRepository.update(id, data);
    return toFinancialRecordResponse(record);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.ensureRecordExists(id);
    await this.financialRecordsRepository.softDelete(id, user.id);
  }

  private async ensureRecordExists(id: string): Promise<void> {
    const record = await this.financialRecordsRepository.findActiveById(id);

    if (!record) {
      throw new NotFoundException('Financial record not found');
    }
  }
}
