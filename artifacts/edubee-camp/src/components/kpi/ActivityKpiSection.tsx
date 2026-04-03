import React from 'react';
import { StaffKpiResult } from '../../types/kpi';
import { Users, CheckCircle2, TrendingUp, CreditCard, Stamp } from 'lucide-react';

type Props = {
  data: Pick<StaffKpiResult,
    'leadCount' | 'conversionCount' | 'conversionRate'
    | 'paymentProcessedCount' | 'visaGrantedCount'
  >;
};

interface ItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  iconBg?: string;
  iconColor?: string;
}

const Item: React.FC<ItemProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  valueColor = 'text-[#1C1917]',
  iconBg    = 'bg-[#F4F3F1]',
  iconColor = 'text-[#57534E]',
}) => (
  <div className="flex flex-col items-center p-4 bg-[#FAFAF9] rounded-xl border border-[#E8E6E2]">
    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-2 ${iconBg} ${iconColor}`}>
      <Icon className="w-4 h-4" strokeWidth={1.8} />
    </div>
    <span className="text-xs font-medium text-[#A8A29E] mb-1 text-center leading-tight">{label}</span>
    <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
    {sub && <span className="text-xs text-[#A8A29E] mt-0.5">{sub}</span>}
  </div>
);

export const ActivityKpiSection: React.FC<Props> = ({ data }) => (
  <div className="bg-white rounded-xl border border-[#E8E6E2] p-5"
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
    <h3 className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-4">
      Activity KPI
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Item
        icon={Users}
        label="New Leads"
        value={data.leadCount}
        sub="total"
        iconBg="bg-[--e-orange-lt]"
        iconColor="text-[--e-orange]"
      />
      <Item
        icon={CheckCircle2}
        label="Conversions"
        value={data.conversionCount}
        sub="contracts"
        valueColor="text-[#16A34A]"
        iconBg="bg-[#F0FDF4]"
        iconColor="text-[#16A34A]"
      />
      <Item
        icon={TrendingUp}
        label="Conv. Rate"
        value={`${data.conversionRate.toFixed(1)}%`}
        valueColor={data.conversionRate >= 30 ? 'text-[#16A34A]' : 'text-[#CA8A04]'}
        iconBg={data.conversionRate >= 30 ? 'bg-[#F0FDF4]' : 'bg-[#FEFCE8]'}
        iconColor={data.conversionRate >= 30 ? 'text-[#16A34A]' : 'text-[#CA8A04]'}
      />
      <Item
        icon={CreditCard}
        label="Payments"
        value={data.paymentProcessedCount}
        sub="processed"
        iconBg="bg-[#EFF6FF]"
        iconColor="text-[#2563EB]"
      />
      <Item
        icon={Stamp}
        label="Visa Granted"
        value={data.visaGrantedCount}
        sub="approved"
        valueColor="text-[#2563EB]"
        iconBg="bg-[#EFF6FF]"
        iconColor="text-[#2563EB]"
      />
    </div>
  </div>
);
