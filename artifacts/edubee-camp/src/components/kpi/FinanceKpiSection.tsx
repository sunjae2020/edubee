import React from 'react';
import { StaffKpiResult } from '../../types/kpi';

type Props = {
  data: Pick<StaffKpiResult,
    'arScheduled' | 'arCollected' | 'arOverdue'
    | 'apScheduled' | 'apPaid'
    | 'netRevenue' | 'targetAmount' | 'excessAmount'
  >;
  currency?: string;
};

const fmt = (n: number, cur = 'AUD') =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: cur }).format(n);

const Row: React.FC<{
  label: string; value: number; sub?: string;
  indent?: boolean; bold?: boolean; color?: string; currency?: string;
}> = ({ label, value, sub, indent, bold, color = 'text-gray-900', currency = 'AUD' }) => (
  <div className={`flex items-center justify-between py-2 ${indent ? 'pl-4' : ''} ${bold ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
    <span className={`text-sm ${bold ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
      {indent && <span className="mr-1 text-gray-300">└</span>}
      {label}
      {sub && <span className="ml-1 text-xs text-gray-400">({sub})</span>}
    </span>
    <span className={`text-sm font-medium ${color} ${bold ? 'text-base font-bold' : ''}`}>
      {fmt(value, currency)}
    </span>
  </div>
);

export const FinanceKpiSection: React.FC<Props> = ({ data, currency = 'AUD' }) => {
  const isExcess    = data.excessAmount > 0;
  const isShortfall = data.excessAmount < 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        💰 파이낸스 KPI
      </h3>
      <div className="space-y-0">
        <Row label="AR 수금 예정" value={data.arScheduled} sub="기간 내 합계" currency={currency} />
        <Row label="AR 실제 수금" value={data.arCollected} indent color="text-green-600" currency={currency} />
        {data.arOverdue > 0 && (
          <Row label="AR 연체" value={data.arOverdue} indent color="text-red-500" currency={currency} />
        )}

        <div className="my-2 border-t border-dashed border-gray-100" />
        <Row label="AP 지급 예정" value={data.apScheduled} sub="기간 내 합계" currency={currency} />
        <Row label="AP 실제 지급" value={data.apPaid} indent color="text-orange-500" currency={currency} />

        <Row
          label="넷 매출" value={data.netRevenue} sub="수금 − 지급" bold
          color={data.netRevenue >= 0 ? 'text-blue-600' : 'text-red-500'}
          currency={currency}
        />

        <div className="my-2 border-t border-dashed border-gray-100" />
        <Row label="목표 금액" value={data.targetAmount} currency={currency} />

        <div className={`flex items-center justify-between py-2 px-3 mt-2 rounded-lg border
          ${isExcess    ? 'bg-green-50 border-green-200' : ''}
          ${isShortfall ? 'bg-red-50 border-red-200'     : ''}
          ${!isExcess && !isShortfall ? 'bg-gray-50 border-gray-200' : ''}
        `}>
          <span className="text-sm font-semibold text-gray-700">
            {isExcess ? '✅ 초과 달성' : isShortfall ? '⚠️ 목표 미달' : '➖ 목표 달성'}
          </span>
          <span className={`text-base font-bold
            ${isExcess    ? 'text-green-600' : ''}
            ${isShortfall ? 'text-red-500'   : ''}
            ${!isExcess && !isShortfall ? 'text-gray-500' : ''}
          `}>
            {isExcess ? '+' : ''}{fmt(data.excessAmount, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
