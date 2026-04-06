import React from 'react';
import { KpiFilter, KpiPeriodType } from '../../types/kpi';
import { Search, RefreshCw } from 'lucide-react';

interface Props {
  filter:    KpiFilter;
  onChange:  (f: KpiFilter) => void;
  onRefresh: () => void;
  loading?:  boolean;
}

const PERIOD_OPTIONS: { value: KpiPeriodType; label: string }[] = [
  { value: 'monthly',   label: 'Monthly'     },
  { value: 'quarterly', label: 'Quarterly'   },
  { value: 'half_year', label: 'Half-Yearly' },
  { value: 'yearly',    label: 'Annually'    },
];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function genMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: v, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts.reverse();
}

const SELECT_CLS =
  'text-sm border border-[#E8E6E2] rounded-lg px-3 py-2 bg-white text-[#1C1917] ' +
  'focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange) transition-colors';

export const KpiFilterBar: React.FC<Props> = ({ filter, onChange, onRefresh, loading }) => (
  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#E8E6E2]"
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>

    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[#57534E] whitespace-nowrap">Period</label>
      <select
        value={filter.periodType}
        onChange={e => onChange({ ...filter, periodType: e.target.value as KpiPeriodType })}
        className={SELECT_CLS}
      >
        {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>

    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[#57534E] whitespace-nowrap">Month</label>
      <select
        value={filter.yearMonth}
        onChange={e => onChange({ ...filter, yearMonth: e.target.value })}
        className={SELECT_CLS}
      >
        {genMonthOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>

    <button
      onClick={onRefresh}
      disabled={loading}
      className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
        bg-(--e-orange) text-white hover:bg-(--e-orange-hover) hover:-translate-y-px
        hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)] active:bg-(--e-orange-active)
        disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {loading
        ? <RefreshCw className="w-4 h-4 animate-spin" />
        : <Search className="w-4 h-4" />}
      Search
    </button>
  </div>
);
