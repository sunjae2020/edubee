export type KpiPeriodType = 'monthly' | 'quarterly' | 'half_year' | 'yearly';

export type KpiStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';

export type IncentiveType = 'percentage' | 'fixed' | 'none';

export interface StaffKpiResult {
  staffId:               string;
  staffName:             string;
  periodType:            KpiPeriodType;
  periodStart:           string;
  periodEnd:             string;
  leadCount:             number;
  conversionCount:       number;
  conversionRate:        number;
  paymentProcessedCount: number;
  visaGrantedCount:      number;
  arScheduled:           number;
  arCollected:           number;
  arOverdue:             number;
  apScheduled:           number;
  apPaid:                number;
  netRevenue:            number;
  targetAmount:          number;
  excessAmount:          number;
  incentiveType:         IncentiveType | null;
  incentiveRate:         number | null;
  incentiveFixed:        number | null;
  incentiveAmount:       number;
  kpiPeriodId?:          string;
  kpiStatus?:            KpiStatus;
}

export interface TeamKpiResult {
  teamId:                string;
  teamName:              string;
  memberCount:           number;
  members:               StaffKpiResult[];
  leadCount:             number;
  conversionCount:       number;
  conversionRate:        number;
  paymentProcessedCount: number;
  visaGrantedCount:      number;
  arScheduled:     number;
  arCollected:     number;
  arOverdue:       number;
  apScheduled:     number;
  apPaid:          number;
  netRevenue:      number;
  targetAmount:    number;
  excessAmount:    number;
  incentiveType:   IncentiveType | null;
  incentiveRate:   number | null;
  incentiveFixed:  number | null;
  incentiveAmount: number;
  kpiPeriodId?:    string;
  kpiStatus?:      KpiStatus;
}

export interface KpiSummary {
  totalStaff:       number;
  totalLeads:       number;
  totalConversions: number;
  totalArCollected: number;
  totalApPaid:      number;
  totalNetRevenue:  number;
  totalIncentive:   number;
}

export interface KpiSummaryResponse {
  period:  { periodType: string; periodStart: string; periodEnd: string };
  summary: KpiSummary;
  staff:   StaffKpiResult[];
}

export interface KpiTarget {
  id:              string;
  staffId?:        string;
  teamId?:         string;
  staffName?:      string;
  teamName?:       string;
  periodType:      KpiPeriodType;
  targetAmount:    number;
  incentiveType:   IncentiveType;
  incentiveRate?:  number;
  incentiveFixed?: number;
  validFrom:       string;
  validTo?:        string;
  description?:    string;
  status:          string;
  createdOn:       string;
}

export interface KpiTargetForm {
  staffId?:        string;
  teamId?:         string;
  periodType:      KpiPeriodType;
  targetAmount:    number | '';
  incentiveType:   IncentiveType;
  incentiveRate?:  number | '';
  incentiveFixed?: number | '';
  validFrom:       string;
  validTo?:        string;
  description?:    string;
}

export interface KpiFilter {
  periodType: KpiPeriodType;
  yearMonth:  string;
}
