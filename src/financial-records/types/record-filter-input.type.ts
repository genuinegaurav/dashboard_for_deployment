import { RecordType } from '../../common/enums/record-type.enum';
import { RecordSortBy } from '../../common/enums/record-sort-by.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

export interface RecordFilterInput {
  type?: RecordType;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: RecordSortBy;
  sortOrder?: SortOrder;
}
