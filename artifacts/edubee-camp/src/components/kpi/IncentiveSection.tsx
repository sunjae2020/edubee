import React from 'react';
import { StaffKpiResult, KpiStatus, IncentiveType } from '../../types/kpi';

interface Props {
  data: Pick<StaffKpiResult,
    'excessAmount' | 'incentiveType' | 'incentiveRate'
    | 'incentiveFixed' | 'incentiveAmount'
    | 'kpiPeriodId'   | 'kpiStatus'
  >;
  entityType:  'staff' | 'team';
  canApprove:  boolean;
  onCalculate: () => void;
  onApprove:   (id: string) => void;
  onPay:       (id: string) => void;
  calculating?: boolean;
  processing?:  boolean;
}

const STATUS_CFG: Record<KpiStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'text-gray-600',   bg: 'bg-gray-100'   },
  submitted: { label: 'Submitted', color: 'text-blue-600',   bg: 'bg-blue-100'   },
  approved:  { label: 'Approved',  color: 'text-green-600',  bg: 'bg-green-100'  },
  paid:      { label: 'Paid',      color: 'text-purple-600', bg: 'bg-purple-100' },
  rejected:  { label: 'Rejected',  color: 'text-red-600',    bg: 'bg-red-100'    },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

function incentiveLabel(
  type: IncentiveType | null, rate: number | null, fixed: number | null
): string {
  if (!type || type === 'none') return '성과급 없음';
  if (type === 'percentage' && rate) return `초과분의 ${(rate * 100).toFixed(1)}%`;
  if (type === 'fixed' && fixed)     return `고정 ${fmt(fixed)}`;
  return '-';
}

export const IncentiveSection: React.FC<Props> = ({
  data, canApprove,
  onCalculate, onApprove, onPay,
  calculating, processing,
}) => {
  const status = data.kpiStatus as KpiStatus | undefined;
  const cfg    = status ? STATUS_CFG[status] : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          🎯 성과급 (Incentive)
        </h3>
        {cfg && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">성과급 방식</span>
          <span className="text-sm font-medium text-gray-800">
            {incentiveLabel(data.incentiveType, data.incentiveRate, data.incentiveFixed)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">초과 달성액</span>
          <span className={`text-sm font-medium ${data.excessAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {fmt(data.excessAmount)}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-yellow-200">
          <span className="text-sm font-semibold text-gray-700">💰 최종 성과급</span>
          <span className="text-lg font-bold text-amber-600">{fmt(data.incentiveAmount)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {(!status || status === 'draft') && (
          <button
            onClick={onCalculate} disabled={calculating}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {calculating ? '계산 중...' : '💾 계산 & 저장'}
          </button>
        )}

        {status === 'draft' && data.kpiPeriodId && (
          <button
            onClick={() => onApprove(data.kpiPeriodId!)} disabled={processing}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {processing ? '처리 중...' : '📤 승인 요청'}
          </button>
        )}

        {status === 'submitted' && canApprove && data.kpiPeriodId && (
          <button
            onClick={() => onApprove(data.kpiPeriodId!)} disabled={processing}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {processing ? '처리 중...' : '✅ 승인'}
          </button>
        )}

        {status === 'approved' && canApprove && data.kpiPeriodId && (
          <button
            onClick={() => onPay(data.kpiPeriodId!)} disabled={processing}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {processing ? '처리 중...' : '💸 지급 처리'}
          </button>
        )}

        {status === 'paid' && (
          <div className="w-full px-4 py-2 text-sm font-medium text-center text-purple-600 bg-purple-50 border border-purple-200 rounded-md">
            ✨ 지급 완료
          </div>
        )}
      </div>
    </div>
  );
};
