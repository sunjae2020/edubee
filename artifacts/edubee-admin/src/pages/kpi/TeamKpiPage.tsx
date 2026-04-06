import React, { useState, useEffect } from 'react';
import { useAuth }            from '@/hooks/use-auth';
import { KpiFilter }          from '@/types/kpi';
import { KpiFilterBar }       from '@/components/kpi/KpiFilterBar';
import { ActivityKpiSection } from '@/components/kpi/ActivityKpiSection';
import { FinanceKpiSection }  from '@/components/kpi/FinanceKpiSection';
import { IncentiveSection }   from '@/components/kpi/IncentiveSection';
import { useTeamKpi, useKpiApproval } from '@/hooks/useKpi';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamItem { id: string; name: string; }

const BASE  = import.meta.env.BASE_URL.replace(/\/$/, '');
const fmt   = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

const SELECT_CLS =
  'text-sm border border-[#E8E6E2] rounded-lg px-3 py-2 bg-white text-[#1C1917] ' +
  'focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange) transition-colors';

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-(--e-orange-lt)">
            <Users className="w-5 h-5 text-(--e-orange)" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">Team KPI</h1>
            <p className="text-sm text-[#A8A29E] mt-0.5">Team performance analysis with individual staff breakdown</p>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className={`${SELECT_CLS} pr-8 appearance-none`}
          >
            <option value="">Select team...</option>
            {teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
        </div>
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
            <span className="text-base font-semibold text-[#1C1917]">{data.teamName}</span>
            <span className="text-xs px-2.5 py-1 bg-(--e-orange-lt) text-(--e-orange) rounded-full font-medium border border-(--e-orange)/20">
              {data.memberCount} {data.memberCount === 1 ? 'member' : 'members'}
            </span>
            {data.members[0] && (
              <span className="text-sm text-[#A8A29E]">
                {data.members[0].periodStart} – {data.members[0].periodEnd}
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

          <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-3.5 border-b border-[#E8E6E2] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A8A29E]" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-[#1C1917]">Individual Staff Breakdown</h3>
            </div>
            <div className="divide-y divide-[#F4F3F1]">
              {data.members.map(member => (
                <div key={member.staffId}>
                  <button
                    onClick={() => setExpandedStaff(
                      expandedStaff === member.staffId ? null : member.staffId
                    )}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-(--e-orange-lt) flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-(--e-orange)">
                          {member.staffName?.charAt(0) ?? '?'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#1C1917]">{member.staffName}</span>
                      <span className="text-xs text-[#A8A29E]">
                        Leads {member.leadCount} · Conv. {member.conversionCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-(--e-orange)">{fmt(member.netRevenue)}</span>
                      {expandedStaff === member.staffId
                        ? <ChevronUp className="w-4 h-4 text-[#A8A29E]" />
                        : <ChevronDown className="w-4 h-4 text-[#A8A29E]" />
                      }
                    </div>
                  </button>

                  {expandedStaff === member.staffId && (
                    <div className="px-5 pb-5 bg-[#FAFAF9]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
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
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-(--e-orange-lt) flex items-center justify-center">
            <Users className="w-6 h-6 text-(--e-orange)" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[#A8A29E]">Select a team and click Search.</p>
        </div>
      )}
    </div>
  );
}
