import React from 'react';
import { StaffKpiResult, KpiStatus, IncentiveType } from '../../types/kpi';
import { Target, Save, Send, CheckCheck, Banknote, BadgeCheck } from 'lucide-react';

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

const STATUS_CFG: Record<KpiStatus, { label: string; textColor: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     textColor: 'text-[#57534E]',  bg: 'bg-[#F4F3F1]', border: 'border-[#E8E6E2]' },
  submitted: { label: 'Submitted', textColor: 'text-[#2563EB]',  bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]' },
  approved:  { label: 'Approved',  textColor: 'text-[#16A34A]',  bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]' },
  paid:      { label: 'Paid',      textColor: 'text-[--e-orange]',  bg: 'bg-[--e-orange-lt]', border: 'border-[--e-orange]/30' },
  rejected:  { label: 'Rejected',  textColor: 'text-[#DC2626]',  bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

function incentiveLabel(
  type: IncentiveType | null, rate: number | null, fixed: number | null
): string {
  if (!type || type === 'none') return 'No incentive';
  if (type === 'percentage' && rate) return `${(rate * 100).toFixed(1)}% of surplus`;
  if (type === 'fixed' && fixed)     return `Fixed ${fmt(fixed)}`;
  return '—';
}

const BTN_BASE =
  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export const IncentiveSection: React.FC<Props> = ({
  data, canApprove,
  onCalculate, onApprove, onPay,
  calculating, processing,
}) => {
  const status = data.kpiStatus as KpiStatus | undefined;
  const cfg    = status ? STATUS_CFG[status] : null;

  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 h-full flex flex-col"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">
          Incentive
        </h3>
        {cfg && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
            {cfg.label}
          </span>
        )}
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#57534E]">Incentive Type</span>
          <span className="text-sm font-medium text-[#1C1917]">
            {incentiveLabel(data.incentiveType, data.incentiveRate, data.incentiveFixed)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-[#57534E]">Surplus Amount</span>
          <span className={`text-sm font-medium ${data.excessAmount > 0 ? 'text-[#16A34A]' : 'text-[#A8A29E]'}`}>
            {fmt(data.excessAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[--e-orange-lt] border border-[--e-orange]/20">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[--e-orange]" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-[#1C1917]">Final Incentive</span>
          </div>
          <span className="text-lg font-bold text-[--e-orange]">{fmt(data.incentiveAmount)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {(!status || status === 'draft') && (
          <button
            onClick={onCalculate}
            disabled={calculating}
            className={`${BTN_BASE} bg-[--e-orange] text-white hover:bg-[--e-orange-hover] hover:-translate-y-px hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)] active:bg-[--e-orange-active]`}
          >
            {calculating
              ? <><Save className="w-4 h-4 animate-pulse" /> Calculating...</>
              : <><Save className="w-4 h-4" /> Calculate &amp; Save</>
            }
          </button>
        )}

        {status === 'draft' && data.kpiPeriodId && (
          <button
            onClick={() => onApprove(data.kpiPeriodId!)}
            disabled={processing}
            className={`${BTN_BASE} bg-[#1C1917] text-white hover:bg-[#57534E]`}
          >
            {processing
              ? <><Send className="w-4 h-4 animate-pulse" /> Processing...</>
              : <><Send className="w-4 h-4" /> Submit for Approval</>
            }
          </button>
        )}

        {status === 'submitted' && canApprove && data.kpiPeriodId && (
          <button
            onClick={() => onApprove(data.kpiPeriodId!)}
            disabled={processing}
            className={`${BTN_BASE} bg-[#16A34A] text-white hover:bg-[#15803D]`}
          >
            {processing
              ? <><CheckCheck className="w-4 h-4 animate-pulse" /> Processing...</>
              : <><CheckCheck className="w-4 h-4" /> Approve</>
            }
          </button>
        )}

        {status === 'approved' && canApprove && data.kpiPeriodId && (
          <button
            onClick={() => onPay(data.kpiPeriodId!)}
            disabled={processing}
            className={`${BTN_BASE} bg-[--e-orange] text-white hover:bg-[--e-orange-hover] hover:-translate-y-px hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)]`}
          >
            {processing
              ? <><Banknote className="w-4 h-4 animate-pulse" /> Processing...</>
              : <><Banknote className="w-4 h-4" /> Mark as Paid</>
            }
          </button>
        )}

        {status === 'paid' && (
          <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-semibold text-[--e-orange] bg-[--e-orange-lt] border border-[--e-orange]/30">
            <BadgeCheck className="w-4 h-4" />
            Payment Complete
          </div>
        )}
      </div>
    </div>
  );
};
