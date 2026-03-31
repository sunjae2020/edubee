import { useState, useCallback } from 'react';
import {
  StaffKpiResult, TeamKpiResult,
  KpiSummaryResponse, KpiTarget, KpiTargetForm,
  KpiFilter,
} from '../types/kpi';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('edubee_token') ?? '';
  const res = await fetch(`${BASE}/api/kpi${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API Error');
  return json.data as T;
}

export function useStaffKpi() {
  const [data,    setData]    = useState<StaffKpiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchKpi = useCallback(async (staffId: string, filter: KpiFilter) => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch<StaffKpiResult>(
        `/staff/${staffId}?periodType=${filter.periodType}&yearMonth=${filter.yearMonth}`
      );
      setData(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const calculate = useCallback(async (staffId: string, filter: KpiFilter) => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch<StaffKpiResult>(
        `/calculate/staff/${staffId}`,
        { method: 'POST', body: JSON.stringify(filter) }
      );
      setData(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetchKpi, calculate };
}

export function useTeamKpi() {
  const [data,    setData]    = useState<TeamKpiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchKpi = useCallback(async (teamId: string, filter: KpiFilter) => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch<TeamKpiResult>(
        `/team/${teamId}?periodType=${filter.periodType}&yearMonth=${filter.yearMonth}`
      );
      setData(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const calculate = useCallback(async (teamId: string, filter: KpiFilter) => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch<TeamKpiResult>(
        `/calculate/team/${teamId}`,
        { method: 'POST', body: JSON.stringify(filter) }
      );
      setData(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetchKpi, calculate };
}

export function useKpiSummary() {
  const [data,    setData]    = useState<KpiSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchSummary = useCallback(async (filter: KpiFilter) => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch<KpiSummaryResponse>(
        `/summary?periodType=${filter.periodType}&yearMonth=${filter.yearMonth}`
      );
      setData(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetchSummary };
}

export function useKpiTargets() {
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchTargets = useCallback(async (
    params?: { staffId?: string; teamId?: string }
  ) => {
    setLoading(true); setError(null);
    try {
      const qs = params?.staffId ? `?staffId=${params.staffId}`
               : params?.teamId  ? `?teamId=${params.teamId}`
               : '';
      const r = await apiFetch<KpiTarget[]>(`/targets${qs}`);
      setTargets(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const createTarget = useCallback(async (
    form: KpiTargetForm & { createdBy: string }
  ) => {
    setSaving(true);
    try {
      await apiFetch('/targets', { method: 'POST', body: JSON.stringify(form) });
      await fetchTargets();
    } finally { setSaving(false); }
  }, [fetchTargets]);

  const updateTarget = useCallback(async (
    id: string, form: Partial<KpiTargetForm>
  ) => {
    setSaving(true);
    try {
      await apiFetch(`/targets/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      await fetchTargets();
    } finally { setSaving(false); }
  }, [fetchTargets]);

  return { targets, loading, saving, error, fetchTargets, createTarget, updateTarget };
}

export function useKpiApproval() {
  const [processing, setProcessing] = useState(false);

  const approve = useCallback(async (
    kpiPeriodId: string, type: 'staff' | 'team', approvedBy: string
  ) => {
    setProcessing(true);
    try {
      await apiFetch(`/approve/${kpiPeriodId}`, {
        method: 'PATCH', body: JSON.stringify({ type, approvedBy }),
      });
    } finally { setProcessing(false); }
  }, []);

  const pay = useCallback(async (kpiPeriodId: string, type: 'staff' | 'team') => {
    setProcessing(true);
    try {
      await apiFetch(`/pay/${kpiPeriodId}`, {
        method: 'PATCH', body: JSON.stringify({ type }),
      });
    } finally { setProcessing(false); }
  }, []);

  return { processing, approve, pay };
}
