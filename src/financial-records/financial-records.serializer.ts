import { RecordType } from '../common/enums/record-type.enum';
import { centsToAmount } from './financial-records.helpers';
import { FinancialRecordEntity } from './financial-records.select';

export interface FinancialRecordResponse {
  id: string;
  amount: number;
  type: RecordType;
  category: string;
  recordDate: Date;
  notes: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toFinancialRecordResponse(
  record: FinancialRecordEntity,
): FinancialRecordResponse {
  return {
    id: record.id,
    amount: centsToAmount(record.amountInCents),
    type: record.type as RecordType,
    category: record.category,
    recordDate: record.recordDate,
    notes: record.notes,
    createdByUserId: record.createdByUserId,
    updatedByUserId: record.updatedByUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
