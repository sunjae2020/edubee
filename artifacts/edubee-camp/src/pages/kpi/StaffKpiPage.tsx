import React, { useState, useEffect } from 'react';
import { useAuth }            from '@/hooks/use-auth';
import { KpiFilter }          from '@/types/kpi';
import { KpiFilterBar }       from '@/components/kpi/KpiFilterBar';
import { ActivityKpiSection } from '@/components/kpi/ActivityKpiSection';
import { FinanceKpiSection }  from '@/components/kpi/FinanceKpiSection';
import { IncentiveSection }   from '@/components/kpi/IncentiveSection';
import { useStaffKpi, useKpiApproval } from '@/hooks/useKpi';

interface StaffItem { id: string; full_name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function StaffKpiPage() {
  const { user: currentUser } = useAuth();
  const canApprove = ['admin', 'super_admin'].includes(currentUser?.role ?? '');

  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [filter,          setFilter]          = useState<KpiFilter>({ periodType: 'monthly', yearMonth: defaultYM });
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentUser?.id ?? '');
  const [staffList,       setStaffList]       = useState<StaffItem[]>([]);

  const { data, loading, error, fetchKpi, calculate } = useStaffKpi();
  const { processing, approve, pay }                   = useKpiApproval();

  useEffect(() => {
    if (canApprove) {
      fetch(`${BASE}/api/users?status=Active`)
        .then(r => r.json())
        .then(j => { if (j.success) setStaffList(j.data ?? []); })
        .catch(() => {});
    }
    const id = currentUser?.id ?? '';
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

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">직원 KPI</h1>
          <p className="text-sm text-gray-500 mt-0.5">직원별 활동 및 파이낸스 성과 분석</p>
        </div>
        {canApprove && (
          <select
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">직원 선택...</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        )}
      </div>

      <KpiFilterBar filter={filter} onChange={setFilter} onRefresh={handleRefresh} loading={loading} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12 text-3xl animate-spin">⟳</div>
      )}

      {data && !loading && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-base font-semibold text-gray-800">{data.staffName}</span>
            <span className="text-sm text-gray-400">{data.periodStart} ~ {data.periodEnd}</span>
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
        <div className="flex flex-col items-center py-16 text-gray-400">
          <span className="text-4xl mb-3">📊</span>
          <p className="text-sm">직원을 선택하고 조회 버튼을 눌러주세요.</p>
        </div>
      )}
    </div>
  );
}
