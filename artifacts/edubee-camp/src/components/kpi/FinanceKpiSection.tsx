import React from 'react';
import { StaffKpiResult } from '../../types/kpi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  label: string;
  value: number;
  sub?: string;
  indent?: boolean;
  bold?: boolean;
  valueColor?: string;
  currency?: string;
}> = ({ label, value, sub, indent, bold, valueColor = 'text-[#1C1917]', currency = 'AUD' }) => (
  <div className={`flex items-center justify-between py-2
    ${indent ? 'pl-4' : ''}
    ${bold ? 'border-t border-[#E8E6E2] mt-1 pt-3' : ''}
  `}>
    <span className={`text-sm ${bold ? 'font-semibold text-[#1C1917]' : 'text-[#57534E]'}`}>
      {indent && <span className="mr-1 text-[#E8E6E2]">└</span>}
      {label}
      {sub && <span className="ml-1 text-xs text-[#A8A29E]">({sub})</span>}
    </span>
    <span className={`text-sm font-medium ${valueColor} ${bold ? 'text-base font-bold' : ''}`}>
      {fmt(value, currency)}
    </span>
  </div>
);

export const FinanceKpiSection: React.FC<Props> = ({ data, currency = 'AUD' }) => {
  const isExcess    = data.excessAmount > 0;
  const isShortfall = data.excessAmount < 0;

  const StatusIcon = isExcess ? TrendingUp : isShortfall ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
      <h3 className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-4">
        Finance KPI
      </h3>

      <div className="space-y-0">
        <Row label="AR Scheduled"   value={data.arScheduled} sub="period total" currency={currency} />
        <Row label="AR Collected"   value={data.arCollected}  indent valueColor="text-[#16A34A]" currency={currency} />
        {data.arOverdue > 0 && (
          <Row label="AR Overdue"   value={data.arOverdue}    indent valueColor="text-[#DC2626]" currency={currency} />
        )}

        <div className="my-2 border-t border-dashed border-[#E8E6E2]" />
        <Row label="AP Scheduled"   value={data.apScheduled} sub="period total" currency={currency} />
        <Row label="AP Paid"        value={data.apPaid}       indent valueColor="text-[#CA8A04]" currency={currency} />

        <Row
          label="Net Revenue"
          value={data.netRevenue}
          sub="collected − paid"
          bold
          valueColor={data.netRevenue >= 0 ? 'text-[--e-orange]' : 'text-[#DC2626]'}
          currency={currency}
        />

        <div className="my-2 border-t border-dashed border-[#E8E6E2]" />
        <Row label="Target Amount"  value={data.targetAmount} currency={currency} />

        <div className={`flex items-center gap-2 justify-between py-2.5 px-3 mt-2 rounded-xl border
          ${isExcess    ? 'bg-[#F0FDF4] border-[#BBF7D0]' : ''}
          ${isShortfall ? 'bg-[#FEF2F2] border-[#FECACA]' : ''}
          ${!isExcess && !isShortfall ? 'bg-[#FAFAF9] border-[#E8E6E2]' : ''}
        `}>
          <div className="flex items-center gap-1.5">
            <StatusIcon
              className={`w-4 h-4
                ${isExcess    ? 'text-[#16A34A]' : ''}
                ${isShortfall ? 'text-[#DC2626]' : ''}
                ${!isExcess && !isShortfall ? 'text-[#A8A29E]' : ''}
              `}
              strokeWidth={2}
            />
            <span className="text-sm font-semibold text-[#1C1917]">
              {isExcess ? 'Target Exceeded' : isShortfall ? 'Below Target' : 'Target Met'}
            </span>
          </div>
          <span className={`text-base font-bold
            ${isExcess    ? 'text-[#16A34A]' : ''}
            ${isShortfall ? 'text-[#DC2626]' : ''}
            ${!isExcess && !isShortfall ? 'text-[#A8A29E]' : ''}
          `}>
            {isExcess ? '+' : ''}{fmt(data.excessAmount, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
