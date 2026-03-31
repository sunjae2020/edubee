import React from 'react';
import { StaffKpiResult } from '../../types/kpi';

type Props = {
  data: Pick<StaffKpiResult,
    'leadCount' | 'conversionCount' | 'conversionRate'
    | 'paymentProcessedCount' | 'visaGrantedCount'
  >;
};

const Item: React.FC<{
  icon: string; label: string; value: string | number;
  sub?: string; color?: string;
}> = ({ icon, label, value, sub, color = 'text-gray-900' }) => (
  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-xs text-gray-500 mb-1">{label}</span>
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
    {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
  </div>
);

export const ActivityKpiSection: React.FC<Props> = ({ data }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5">
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
      📋 활동 KPI
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Item icon="👥" label="신규 리드"   value={data.leadCount}             sub="건" />
      <Item icon="✅" label="전환(계약)"  value={data.conversionCount}       sub="건" color="text-green-600" />
      <Item
        icon="📈" label="전환율"
        value={`${data.conversionRate.toFixed(1)}%`}
        color={data.conversionRate >= 30 ? 'text-green-600' : 'text-orange-500'}
      />
      <Item icon="💳" label="결제 처리"  value={data.paymentProcessedCount} sub="건" />
      <Item icon="🛂" label="비자 승인"  value={data.visaGrantedCount}      sub="건" color="text-blue-600" />
    </div>
  </div>
);
