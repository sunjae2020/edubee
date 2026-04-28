import React, { useState, useEffect } from 'react';
import { useAuth }            from '@/hooks/use-auth';
import { KpiFilter }          from '@/types/kpi';
import { KpiFilterBar }       from '@/components/kpi/KpiFilterBar';
import { ActivityKpiSection } from '@/components/kpi/ActivityKpiSection';
import { FinanceKpiSection }  from '@/components/kpi/FinanceKpiSection';
import { IncentiveSection }   from '@/components/kpi/IncentiveSection';
import { useStaffKpi, useKpiApproval } from '@/hooks/useKpi';
import { BarChart2, ChevronDown, ArrowLeft } from 'lucide-react';

interface StaffItem { id: string; full_name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const SELECT_CLS =
  'text-sm border border-[#E8E6E2] rounded-lg px-3 py-2 bg-white text-[#1C1917] ' +
  'focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange) transition-colors';

export default function StaffKpiPage() {
  const { user: currentUser } = useAuth();
  const canApprove = ['admin', 'super_admin'].includes(currentUser?.role ?? '');
  const canViewTeam = canApprove || currentUser?.role === 'team_manager';

  // Read staffId from URL parameter (?staffId=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const urlStaffId = urlParams.get('staffId') ?? '';

  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // If staffId exists in URL use it as initial value, otherwise use current user
  const initialStaffId = urlStaffId || (currentUser?.id ?? '');
  const [filter,          setFilter]          = useState<KpiFilter>({ periodType: 'monthly', yearMonth: defaultYM });
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId);
  const [staffList,       setStaffList]       = useState<StaffItem[]>([]);
  const [staffName,       setStaffName]       = useState<string>('');

  const { data, loading, error, fetchKpi, calculate } = useStaffKpi();
  const { processing, approve, pay }                   = useKpiApproval();

  // If URL has staffId and it's not the current user → fetch name for display
  useEffect(() => {
    if (urlStaffId && urlStaffId !== currentUser?.id) {
      fetch(`${BASE}/api/users/${urlStaffId}`)
        .then(r => r.json())
        .then(j => {
          const u = j.data ?? j;
          if (u?.fullName) setStaffName(u.fullName);
        })
        .catch(() => {});
    }
  }, [urlStaffId]);

  useEffect(() => {
    if (canViewTeam) {
      fetch(`${BASE}/api/users?status=Active`)
        .then(r => r.json())
        .then(j => { if (j.success) setStaffList(j.data ?? []); })
        .catch(() => {});
    }
    const id = initialStaffId;
    if (id) fetchKpi(id, filter);
  }, []);

  const handleRefresh   = () => { if (selectedStaffId) fetchKpi(selectedStaffId, filter); };
  const handleCalculate = () => { if (selectedStaffId) calculate(selectedStaffId, filter); };

  const handleApprove = async (id: string) => {
    await approve(id, 'staff', currentUser?.id ?? '');
    if (selectedStaffId) await fetchKpi(selectedStaffId, filter);
  };
  const handlePay = async (id: string) => {
    await pay(id, 'staff');
    if (selectedStaffId) await fetchKpi(selectedStaffId, filter);
  };

  // If staffId is provided in URL (viewing another staff's KPI) → lock staff selector
  const isLockedToStaff = !!urlStaffId && !canApprove;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {urlStaffId && (
            <button
              onClick={() => window.close()}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-(--e-orange-lt)">
            <BarChart2 className="w-5 h-5 text-(--e-orange)" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">Staff KPI</h1>
            <p className="text-sm text-[#A8A29E] mt-0.5">
              {isLockedToStaff && staffName
                ? `${staffName}'s KPI`
                : 'Activity and finance performance by staff member'}
            </p>
          </div>
        </div>

        {/* Staff selector dropdown: shown to admin only, hidden when locked by URL */}
        {canApprove && !isLockedToStaff && (
          <div className="relative">
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className={`${SELECT_CLS} pr-8 appearance-none`}
            >
              <option value="">Select staff...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
          </div>
        )}

        {/* Admin with a specific staff locked via URL → hide dropdown but keep staffId */}
        {canApprove && isLockedToStaff && staffName && (
          <span className="text-sm font-medium text-[#1C1917] px-3 py-2 bg-(--e-orange-lt) rounded-lg">
            {staffName}
          </span>
        )}
      </div>

      <KpiFilterBar filter={filter} onChange={setFilter} onRefresh={handleRefresh} loading={loading} />

      {error && (
        <div className="flex items-center gap-2 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#DC2626] text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-(--e-orange) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-base font-semibold text-[#1C1917]">{data.staffName}</span>
            <span className="text-sm text-[#A8A29E]">{data.periodStart} – {data.periodEnd}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <ActivityKpiSection data={data} />
            </div>
            <div className="lg:col-span-2">
              <FinanceKpiSection data={data} />
            </div>
            <div className="lg:col-span-1">
              <IncentiveSection
                data={data}
                entityType="staff"
                canApprove={canApprove}
                onCalculate={handleCalculate}
                onApprove={handleApprove}
                onPay={handlePay}
                calculating={loading}
                processing={processing}
              />
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-(--e-orange-lt) flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-(--e-orange)" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[#A8A29E]">Select a staff member and click Search.</p>
        </div>
      )}
    </div>
  );
}
