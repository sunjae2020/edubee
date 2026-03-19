import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ALL_ROLES = [
  "super_admin", "admin", "camp_coordinator", "education_agent",
  "partner_institute", "partner_hotel", "partner_pickup", "partner_tour", "parent_client",
];
const ALL_STATUSES = ["active", "inactive", "suspended", "pending_verification"];
const ADMIN_ROLES = ["super_admin", "admin"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  camp_coordinator: "bg-orange-100 text-orange-700",
  education_agent: "bg-teal-100 text-teal-700",
  partner_institute: "bg-green-100 text-green-700",
  partner_hotel: "bg-yellow-100 text-yellow-700",
  partner_pickup: "bg-pink-100 text-pink-700",
  partner_tour: "bg-indigo-100 text-indigo-700",
  parent_client: "bg-gray-100 text-gray-600",
};

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => axios.get(`${BASE}/api/users/${id}`).then(r => r.data),
  });

  const userRec = data?.data ?? data;
  const canEdit = ADMIN_ROLES.includes(currentUser?.role ?? "");

  const updateUser = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/users/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", id] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: userRec ?? {},
    onSave: async (data) => { await updateUser.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!userRec) return <div className="p-6 text-muted-foreground">User not found.</div>;

  const initials = (userRec.fullName ?? userRec.email ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const roleColor = ROLE_COLORS[userRec.role ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <DetailPageLayout
      title={userRec.fullName ?? userRec.email}
      subtitle={userRec.email}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>{(userRec.role ?? "—").replace(/_/g, " ")}</span>}
      backPath="/admin/users"
      backLabel="Users"
      headerExtra={
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#F5821F]/10 text-[#F5821F] text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
      }
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailSection title="Account">
          <EditableField label="Full Name" isEditing={isEditing} value={userRec.fullName}
            editValue={getValue("fullName")} onEdit={v => setField("fullName", v)} />
          <DetailRow label="Email" value={userRec.email} />
          <EditableField label="Role" isEditing={isEditing} value={(userRec.role ?? "").replace(/_/g, " ")}
            editChildren={
              <Select value={getValue("role")} onValueChange={v => setField("role", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter(r => r !== "super_admin" || currentUser?.role === "super_admin")
                    .map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            } />
          <EditableField label="Status" isEditing={isEditing} value={(userRec.status ?? "").replace(/_/g, " ")}
            editChildren={
              <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            } />
          <DetailRow label="Created" value={userRec.createdAt ? format(new Date(userRec.createdAt), "PPP") : "—"} />
          <DetailRow label="Last Login" value={userRec.lastLoginAt ? format(new Date(userRec.lastLoginAt), "PPp") : "—"} />
        </DetailSection>

        <DetailSection title="Profile">
          <EditableField label="Phone" isEditing={isEditing} value={userRec.phone}
            editValue={getValue("phone")} onEdit={v => setField("phone", v)} />
          <EditableField label="Country" isEditing={isEditing} value={userRec.country}
            editValue={getValue("country")} onEdit={v => setField("country", v)} />
          <EditableField label="Language" isEditing={isEditing} value={userRec.preferredLanguage}
            editValue={getValue("preferredLanguage")} onEdit={v => setField("preferredLanguage", v)} />
          <DetailRow label="2FA Enabled" value={userRec.twoFactorEnabled ? "Yes" : "No"} />
        </DetailSection>

        {(userRec.role === "camp_coordinator" || userRec.role === "education_agent") && (
          <DetailSection title="Business Info" className="lg:col-span-2">
            <EditableField label="Company Name" isEditing={isEditing} value={userRec.companyName}
              editValue={getValue("companyName")} onEdit={v => setField("companyName", v)} />
            <EditableField label="Business Reg #" isEditing={isEditing} value={userRec.businessRegNo}
              editValue={getValue("businessRegNo")} onEdit={v => setField("businessRegNo", v)} />
            <EditableField label="Country of Ops" isEditing={isEditing} value={userRec.countryOfOps}
              editValue={getValue("countryOfOps")} onEdit={v => setField("countryOfOps", v)} />
            {userRec.role === "camp_coordinator" && (
              <EditableField label="Platform Commission %" isEditing={isEditing} value={userRec.platformCommRate}
                editValue={getValue("platformCommRate")} onEdit={v => setField("platformCommRate", v)} type="number" />
            )}
          </DetailSection>
        )}
      </div>
    </DetailPageLayout>
  );
}
