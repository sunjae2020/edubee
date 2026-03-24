import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, User, FileText, Briefcase, Folder, Activity, UserPlus, ChevronDown, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TABS = [
  { key: "details",   label: "Details",   icon: User },
  { key: "leads",     label: "Leads",     icon: Briefcase },
  { key: "contracts", label: "Contracts", icon: FileText },
  { key: "files",     label: "Files",     icon: Folder },
  { key: "activity",  label: "Activity",  icon: Activity },
];

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
         style={{ background: "#FEF0E3", color: "#F5821F" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const active = (status ?? "").toLowerCase() === "active";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
    }`}>
      {status ?? "—"}
    </span>
  );
}

const CREATE_ACCOUNT_TYPES = [
  { label: "Student",      value: "Student" },
  { label: "Organisation", value: "Organisation" },
  { label: "Agent",        value: "Agent" },
  { label: "School",       value: "School" },
  { label: "Staff",        value: "Staff" },
];

export default function ContactDetailPage() {
  const [, params] = useRoute("/admin/crm/contacts/:id");
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("details");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const id = params?.id ?? "";
  const qc = useQueryClient();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["crm-contact", id],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const createAccountMut = useMutation({
    mutationFn: async (accountType: string) => {
      const fullName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
      const r = await axios.post(`${BASE}/api/crm/accounts`, {
        accountType,
        primaryContactId: id,
        ownerId: contact.assignedStaffId ?? undefined,
        name: fullName,
      });
      return r.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm-contact", id] });
      if (data?.id) navigate(`/admin/crm/accounts/${data.id}`);
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
        Loading contact…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
        Contact not found.
      </div>
    );
  }

  const fullName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/admin/crm/contacts")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={fullName || "?"} />
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{fullName || "—"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-stone-500">{contact.accountType}</span>
              <span className="text-stone-300">·</span>
              <StatusBadge status={contact.status} />
            </div>
          </div>
        </div>

        {/* Linked account badge OR Create Account button */}
        <div className="flex-shrink-0 mt-1">
          {contact.linkedAccount ? (
            <button
              onClick={() => navigate(`/admin/crm/accounts/${contact.linkedAccount.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-[#FEF0E3]"
              style={{ borderColor: "#F5821F", color: "#F5821F" }}
            >
              <ExternalLink size={13} />
              {contact.linkedAccount.name}
            </button>
          ) : (
            <div className="relative" ref={createMenuRef}>
              <button
                onClick={() => setShowCreateMenu(v => !v)}
                disabled={createAccountMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#F5821F" }}
              >
                <UserPlus size={13} />
                Create Account
                <ChevronDown size={13} />
              </button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-50 py-1 min-w-[160px]"
                  style={{ border: "1px solid #E8E6E2" }}>
                  {CREATE_ACCOUNT_TYPES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setShowCreateMenu(false);
                        createAccountMut.mutate(opt.value);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#1C1917] hover:bg-[#FAFAF9] transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-[#F5821F] text-[#F5821F]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "details" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailField label="First Name"      value={contact.firstName} />
          <DetailField label="Last Name"       value={contact.lastName} />
          <DetailField label="Title"           value={contact.title} />
          <DetailField label="Date of Birth"   value={contact.dob} />
          <DetailField label="Gender"          value={contact.gender} />
          <DetailField label="Nationality"     value={contact.nationality} />
          <DetailField label="Email"           value={contact.email} />
          <DetailField label="Mobile"          value={contact.mobile} />
          <DetailField label="Office Number"   value={contact.officeNumber} />
          <DetailField label="SNS Type"        value={contact.snsType} />
          <DetailField label="SNS ID"          value={contact.snsId} />
          <DetailField label="Influx Channel"  value={contact.influxChannel} />
          <DetailField label="Important Date 1" value={contact.importantDate1} />
          <DetailField label="Important Date 2" value={contact.importantDate2} />
          {contact.description && (
            <div className="col-span-full">
              <p className="text-xs text-stone-400 mb-0.5">Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{contact.description}</p>
            </div>
          )}
        </div>
      )}

      {tab !== "details" && (
        <div className="flex items-center justify-center h-40 text-stone-400 text-sm">
          {TABS.find(t => t.key === tab)?.label} — coming soon
        </div>
      )}
    </div>
  );
}
