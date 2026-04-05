import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RecordType as PrismaRecordType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { financialRecordSelect } from './financial-records.select';

@Injectable()
export class FinancialRecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    amountInCents: number;
    type: PrismaRecordType;
    category: string;
    recordDate: Date;
    notes: string | null;
    createdByUserId: string;
  }) {
    return this.prisma.financialRecord.create({
      data,
      select: financialRecordSelect,
    });
  }

  findPaginated(
    where: Prisma.FinancialRecordWhereInput,
    page: number,
    pageSize: number,
    orderBy: Prisma.FinancialRecordOrderByWithRelationInput[],
  ) {
    return this.prisma.$transaction([
      this.prisma.financialRecord.count({ where }),
      this.prisma.financialRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: financialRecordSelect,
      }),
    ]);
  }

  findActiveById(id: string) {
    return this.prisma.financialRecord.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: financialRecordSelect,
    });
  }

  update(
    id: string,
    data: Prisma.FinancialRecordUpdateInput,
  ) {
    return this.prisma.financialRecord.update({
      where: { id },
      data,
      select: financialRecordSelect,
    });
  }

  softDelete(id: string, updatedByUserId: string): Promise<void> {
    return this.prisma.financialRecord
      .update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
        },
        select: { id: true },
      })
      .then(() => undefined);
  }
}
