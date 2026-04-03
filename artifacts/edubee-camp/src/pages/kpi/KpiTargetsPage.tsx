import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KpiTarget, KpiTargetForm, KpiPeriodType, IncentiveType } from '@/types/kpi';
import { useKpiTargets } from '@/hooks/useKpi';
import { Target, Plus, ChevronDown, User, Users, Pencil } from 'lucide-react';

interface StaffItem { id: string; full_name: string; }
interface TeamItem  { id: string; name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const PERIOD_LABELS: Record<KpiPeriodType, string> = {
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  half_year: 'Half-Yearly',
  yearly:    'Annually',
};

const INCENTIVE_LABELS: Record<IncentiveType, string> = {
  percentage: 'Percentage',
  fixed:      'Fixed Amount',
  none:       'None',
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

const LABEL_CLS = 'block text-xs font-medium text-[#57534E] mb-1';
const INPUT_CLS =
  'w-full text-sm border border-[#E8E6E2] rounded-lg px-3 py-2 bg-white text-[#1C1917] ' +
  'placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[--e-orange]/40 ' +
  'focus:border-[--e-orange] transition-colors';

const fmtAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

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

  const HEADERS = ['Target', 'Period', 'Amount', 'Incentive', 'Valid Period', 'Status', ''];

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-[--e-orange-lt]">
            <Target className="w-5 h-5 text-[--e-orange]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">KPI Targets</h1>
            <p className="text-sm text-[#A8A29E] mt-0.5">
              Manage target amounts and incentive rules by staff or team
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
            bg-[--e-orange] text-white hover:bg-[--e-orange-hover] hover:-translate-y-px
            hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)] active:bg-[--e-orange-active] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Target
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[--e-orange]/30 p-5 space-y-4"
          style={{ boxShadow: '0 4px_16px_var(--e-orange-shadow-08)' }}>
          <h3 className="text-sm font-semibold text-[#1C1917]">
            {editingId ? 'Edit Target' : 'New Target'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>
                <User className="w-3 h-3 inline mr-1" />Staff Member
              </label>
              <div className="relative">
                <select
                  value={form.staffId}
                  onChange={e => setForm({ ...form, staffId: e.target.value, teamId: '' })}
                  className={`${INPUT_CLS} pr-8 appearance-none`}
                >
                  <option value="">Select (leave blank for team target)</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>
                <Users className="w-3 h-3 inline mr-1" />Team
              </label>
              <div className="relative">
                <select
                  value={form.teamId}
                  onChange={e => setForm({ ...form, teamId: e.target.value, staffId: '' })}
                  className={`${INPUT_CLS} pr-8 appearance-none`}
                >
                  <option value="">Select (leave blank for staff target)</option>
                  {teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Period Type *</label>
              <div className="relative">
                <select
                  value={form.periodType}
                  onChange={e => setForm({ ...form, periodType: e.target.value as KpiPeriodType })}
                  className={`${INPUT_CLS} pr-8 appearance-none`}
                >
                  {(Object.entries(PERIOD_LABELS) as [KpiPeriodType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Target Amount (AUD) *</label>
              <input
                type="number" min="0" step="1000"
                value={form.targetAmount}
                onChange={e => setForm({ ...form, targetAmount: Number(e.target.value) })}
                placeholder="e.g. 30000"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Incentive Type</label>
              <div className="relative">
                <select
                  value={form.incentiveType}
                  onChange={e => setForm({ ...form, incentiveType: e.target.value as IncentiveType })}
                  className={`${INPUT_CLS} pr-8 appearance-none`}
                >
                  {(Object.entries(INCENTIVE_LABELS) as [IncentiveType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
              </div>
            </div>

            {form.incentiveType === 'percentage' && (
              <div>
                <label className={LABEL_CLS}>Incentive Rate (%) *</label>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={form.incentiveRate}
                  onChange={e => setForm({ ...form, incentiveRate: Number(e.target.value) / 100 })}
                  placeholder="e.g. 5 (enter 5 for 5%)"
                  className={INPUT_CLS}
                />
                <p className="text-xs text-[#A8A29E] mt-1">
                  Value: {form.incentiveRate ? `${(Number(form.incentiveRate) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
            )}

            {form.incentiveType === 'fixed' && (
              <div>
                <label className={LABEL_CLS}>Fixed Incentive Amount (AUD) *</label>
                <input
                  type="number" min="0" step="100"
                  value={form.incentiveFixed}
                  onChange={e => setForm({ ...form, incentiveFixed: Number(e.target.value) })}
                  placeholder="e.g. 500"
                  className={INPUT_CLS}
                />
              </div>
            )}

            <div>
              <label className={LABEL_CLS}>Valid From *</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => setForm({ ...form, validFrom: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Valid To (leave blank for no expiry)</label>
              <input
                type="date"
                value={form.validTo}
                onChange={e => setForm({ ...form, validTo: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Notes</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. 2026 H1 Target"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E8E6E2]">
            <button
              onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                bg-[--e-orange] text-white hover:bg-[--e-orange-hover] hover:-translate-y-px
                hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)] disabled:opacity-50
                disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#57534E]
                bg-[#F4F3F1] hover:bg-[#E8E6E2] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[--e-orange] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[#FAFAF9] border-b border-[#E8E6E2] sticky top-0 z-10">
              <tr>
                {HEADERS.map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F1]">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#A8A29E] text-sm">
                    No targets configured.
                  </td>
                </tr>
              ) : targets.map(t => (
                <tr key={t.id} className="hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.staffName
                        ? <>
                            <div className="w-6 h-6 rounded-full bg-[--e-orange-lt] flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-[--e-orange]" />
                            </div>
                            <span className="font-medium text-[#1C1917]">{t.staffName}</span>
                          </>
                        : t.teamName
                          ? <>
                              <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                                <Users className="w-3 h-3 text-[#2563EB]" />
                              </div>
                              <span className="font-medium text-[#1C1917]">{t.teamName}</span>
                            </>
                          : <span className="text-[#A8A29E]">—</span>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#57534E]">{PERIOD_LABELS[t.periodType]}</td>
                  <td className="px-4 py-3 font-semibold text-[--e-orange]">
                    {fmtAUD(t.targetAmount)}
                  </td>
                  <td className="px-4 py-3 text-[#57534E]">
                    {INCENTIVE_LABELS[t.incentiveType]}
                    {t.incentiveType === 'percentage' && t.incentiveRate &&
                      <span className="ml-1 text-xs font-medium text-[--e-orange]">
                        ({(t.incentiveRate * 100).toFixed(1)}%)
                      </span>
                    }
                    {t.incentiveType === 'fixed' && t.incentiveFixed &&
                      <span className="ml-1 text-xs font-medium text-[--e-orange]">
                        ({fmtAUD(t.incentiveFixed)})
                      </span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[#A8A29E] text-xs">
                    {t.validFrom}{t.validTo ? ` – ${t.validTo}` : ' – ongoing'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border
                      ${t.status === 'Active'
                        ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]'
                        : 'bg-[#F4F3F1] text-[#A8A29E] border-[#E8E6E2]'
                      }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(t)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#57534E]
                        hover:text-[--e-orange] transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
