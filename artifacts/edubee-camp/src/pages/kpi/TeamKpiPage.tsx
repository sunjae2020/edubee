import React, { useState, useEffect } from 'react';
import { useAuth }            from '@/hooks/use-auth';
import { KpiFilter }          from '@/types/kpi';
import { KpiFilterBar }       from '@/components/kpi/KpiFilterBar';
import { ActivityKpiSection } from '@/components/kpi/ActivityKpiSection';
import { FinanceKpiSection }  from '@/components/kpi/FinanceKpiSection';
import { IncentiveSection }   from '@/components/kpi/IncentiveSection';
import { useTeamKpi, useKpiApproval } from '@/hooks/useKpi';

interface TeamItem { id: string; name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const fmt  = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

export default function TeamKpiPage() {
  const { user: currentUser } = useAuth();
  const canApprove = ['admin', 'super_admin'].includes(currentUser?.role ?? '');

  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [filter,         setFilter]         = useState<KpiFilter>({ periodType: 'monthly', yearMonth: defaultYM });
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamList,       setTeamList]       = useState<TeamItem[]>([]);
  const [expandedStaff,  setExpandedStaff]  = useState<string | null>(null);

  const { data, loading, error, fetchKpi, calculate } = useTeamKpi();
  const { processing, approve, pay }                   = useKpiApproval();

  useEffect(() => {
    fetch(`${BASE}/api/teams`)
      .then(r => r.json())
      .then(j => { if (j.success) setTeamList(j.data ?? []); })
      .catch(() => {});
  }, []);

  const handleRefresh   = () => { if (selectedTeamId) fetchKpi(selectedTeamId, filter); };
  const handleCalculate = () => { if (selectedTeamId) calculate(selectedTeamId, filter); };

  const handleApprove = async (id: string) => {
    await approve(id, 'team', currentUser?.id ?? '');
    if (selectedTeamId) await fetchKpi(selectedTeamId, filter);
  };
  const handlePay = async (id: string) => {
    await pay(id, 'team');
    if (selectedTeamId) await fetchKpi(selectedTeamId, filter);
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">팀 KPI</h1>
          <p className="text-sm text-gray-500 mt-0.5">팀 단위 성과 분석 및 직원별 상세 내역</p>
        </div>
        <select
          value={selectedTeamId}
          onChange={e => setSelectedTeamId(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">팀 선택...</option>
          {teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <KpiFilterBar filter={filter} onChange={setFilter} onRefresh={handleRefresh} loading={loading} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">⚠️ {error}</div>
      )}
      {loading && <div className="flex justify-center py-12 text-3xl animate-spin">⟳</div>}

      {data && !loading && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-base font-semibold text-gray-800">{data.teamName}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
              {data.memberCount}명
            </span>
            {data.members[0] && (
              <span className="text-sm text-gray-400">
                {data.members[0].periodStart} ~ {data.members[0].periodEnd}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3"><ActivityKpiSection data={data} /></div>
            <div className="lg:col-span-2"><FinanceKpiSection  data={data} /></div>
            <div className="lg:col-span-1">
              <IncentiveSection
                data={data} entityType="team" canApprove={canApprove}
                onCalculate={handleCalculate} onApprove={handleApprove} onPay={handlePay}
                calculating={loading} processing={processing}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">👤 직원별 상세 내역</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {data.members.map(member => (
                <div key={member.staffId}>
                  <button
                    onClick={() => setExpandedStaff(
                      expandedStaff === member.staffId ? null : member.staffId
                    )}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{member.staffName}</span>
                      <span className="text-xs text-gray-400">
                        리드 {member.leadCount} · 전환 {member.conversionCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-600">{fmt(member.netRevenue)}</span>
                      <span className="text-gray-400 text-xs">
                        {expandedStaff === member.staffId ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {expandedStaff === member.staffId && (
                    <div className="px-5 pb-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
                        <ActivityKpiSection data={member} />
                        <FinanceKpiSection  data={member} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedTeamId && !loading && (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <span className="text-4xl mb-3">👥</span>
          <p className="text-sm">팀을 선택하고 조회 버튼을 눌러주세요.</p>
        </div>
      )}
    </div>
  );
}
