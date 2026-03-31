import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KpiTarget, KpiTargetForm, KpiPeriodType, IncentiveType } from '@/types/kpi';
import { useKpiTargets } from '@/hooks/useKpi';

interface StaffItem { id: string; full_name: string; }
interface TeamItem  { id: string; name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const PERIOD_LABELS: Record<KpiPeriodType, string> = {
  monthly:   '월별',
  quarterly: '분기별',
  half_year: '반기별',
  yearly:    '연간',
};

const INCENTIVE_LABELS: Record<IncentiveType, string> = {
  percentage: '% 성과급',
  fixed:      '고정 성과급',
  none:       '없음',
};

const EMPTY_FORM: KpiTargetForm = {
  staffId:       '',
  teamId:        '',
  periodType:    'monthly',
  targetAmount:  '',
  incentiveType: 'none',
  incentiveRate:  '',
  incentiveFixed: '',
  validFrom:     '',
  validTo:       '',
  description:   '',
};

export default function KpiTargetsPage() {
  const { user: currentUser } = useAuth();
  const {
    targets, loading, saving,
    fetchTargets, createTarget, updateTarget,
  } = useKpiTargets();

  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState<KpiTargetForm>(EMPTY_FORM);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [staffList,  setStaffList]  = useState<StaffItem[]>([]);
  const [teamList,   setTeamList]   = useState<TeamItem[]>([]);

  useEffect(() => {
    fetchTargets();
    fetch(`${BASE}/api/users?status=Active`)
      .then(r => r.json())
      .then(j => { if (j.success) setStaffList(j.data ?? []); })
      .catch(() => {});
    fetch(`${BASE}/api/teams`)
      .then(r => r.json())
      .then(j => { if (j.success) setTeamList(j.data ?? []); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.targetAmount || !form.validFrom) return;
    if (!form.staffId && !form.teamId) return;

    if (editingId) {
      await updateTarget(editingId, form);
    } else {
      await createTarget({ ...form, createdBy: currentUser?.id ?? '' });
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (t: KpiTarget) => {
    setForm({
      staffId:       t.staffId       || '',
      teamId:        t.teamId        || '',
      periodType:    t.periodType,
      targetAmount:  t.targetAmount,
      incentiveType: t.incentiveType,
      incentiveRate:  t.incentiveRate  ?? '',
      incentiveFixed: t.incentiveFixed ?? '',
      validFrom:     t.validFrom,
      validTo:       t.validTo      || '',
      description:   t.description  || '',
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KPI 목표 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">직원/팀별 목표 금액 및 성과급 기준 관리</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 목표 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-blue-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? '목표 수정' : '새 목표 설정'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대상 직원</label>
              <select
                value={form.staffId}
                onChange={e => setForm({ ...form, staffId: e.target.value, teamId: '' })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              >
                <option value="">선택 (팀 목표면 비워두기)</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대상 팀</label>
              <select
                value={form.teamId}
                onChange={e => setForm({ ...form, teamId: e.target.value, staffId: '' })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              >
                <option value="">선택 (직원 목표면 비워두기)</option>
                {teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">기간 유형 *</label>
              <select
                value={form.periodType}
                onChange={e => setForm({ ...form, periodType: e.target.value as KpiPeriodType })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              >
                {(Object.entries(PERIOD_LABELS) as [KpiPeriodType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">목표 금액 (AUD) *</label>
              <input
                type="number" min="0" step="1000"
                value={form.targetAmount}
                onChange={e => setForm({ ...form, targetAmount: Number(e.target.value) })}
                placeholder="예: 30000"
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">성과급 방식</label>
              <select
                value={form.incentiveType}
                onChange={e => setForm({ ...form, incentiveType: e.target.value as IncentiveType })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              >
                {(Object.entries(INCENTIVE_LABELS) as [IncentiveType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {form.incentiveType === 'percentage' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">성과급 비율 (%) *</label>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={form.incentiveRate}
                  onChange={e => setForm({ ...form, incentiveRate: Number(e.target.value) / 100 })}
                  placeholder="예: 5 (5% 입력)"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  입력값: {form.incentiveRate ? `${(Number(form.incentiveRate) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
            )}

            {form.incentiveType === 'fixed' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">고정 성과급 금액 (AUD) *</label>
                <input
                  type="number" min="0" step="100"
                  value={form.incentiveFixed}
                  onChange={e => setForm({ ...form, incentiveFixed: Number(e.target.value) })}
                  placeholder="예: 500"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">유효 시작일 *</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => setForm({ ...form, validFrom: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">유효 종료일 (비워두면 영구 적용)</label>
              <input
                type="date"
                value={form.validTo}
                onChange={e => setForm({ ...form, validTo: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="예: 2026년 상반기 목표"
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '저장'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-3xl animate-spin">⟳</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['대상', '기간 유형', '목표 금액', '성과급 방식', '유효 기간', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    설정된 목표가 없습니다.
                  </td>
                </tr>
              ) : targets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {t.staffName ? `👤 ${t.staffName}` : t.teamName ? `👥 ${t.teamName}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{PERIOD_LABELS[t.periodType]}</td>
                  <td className="px-4 py-3 font-medium text-blue-600">
                    {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(t.targetAmount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {INCENTIVE_LABELS[t.incentiveType]}
                    {t.incentiveType === 'percentage' && t.incentiveRate &&
                      ` (${(t.incentiveRate * 100).toFixed(1)}%)`}
                    {t.incentiveType === 'fixed' && t.incentiveFixed &&
                      ` ($${t.incentiveFixed})`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {t.validFrom}{t.validTo ? ` ~ ${t.validTo}` : ' ~'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full
                      ${t.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
