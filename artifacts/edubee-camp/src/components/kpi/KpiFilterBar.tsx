import React from 'react';
import { KpiFilter, KpiPeriodType } from '../../types/kpi';

interface Props {
  filter:    KpiFilter;
  onChange:  (f: KpiFilter) => void;
  onRefresh: () => void;
  loading?:  boolean;
}

const PERIOD_OPTIONS: { value: KpiPeriodType; label: string }[] = [
  { value: 'monthly',   label: '월별'   },
  { value: 'quarterly', label: '분기별' },
  { value: 'half_year', label: '반기별' },
  { value: 'yearly',    label: '연간'   },
];

function genMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: v, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` });
  }
  return opts.reverse();
}

export const KpiFilterBar: React.FC<Props> = ({ filter, onChange, onRefresh, loading }) => (
  <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">기간 유형</label>
      <select
        value={filter.periodType}
        onChange={e => onChange({ ...filter, periodType: e.target.value as KpiPeriodType })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">기준 월</label>
      <select
        value={filter.yearMonth}
        onChange={e => onChange({ ...filter, yearMonth: e.target.value })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {genMonthOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <button
      onClick={onRefresh}
      disabled={loading}
      className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <span className="animate-spin inline-block">⟳</span> : <span>🔍</span>}
      조회
    </button>
  </div>
);
