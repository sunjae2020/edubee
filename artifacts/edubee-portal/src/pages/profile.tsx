import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

interface AccountProfile {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  country: string | null;
  address: string | null;
  website: string | null;
  firstName: string | null;
  lastName: string | null;
  portalRole: string | null;
  portalEmail: string | null;
  status: string;
  createdOn: string;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, mustChangePassword, clearMustChangePassword } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const isForced = mustChangePassword || new URLSearchParams(search).get("force") === "1";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["portal-me"],
    queryFn: () => api.get<{ data: AccountProfile }>("/portal/me").then((r) => r.data),
  });

  const [form, setForm] = useState<Partial<AccountProfile>>({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwError, setPwError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AccountProfile>) =>
      api.put<{ data: AccountProfile }>("/portal/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-me"] });
      toast({ description: "Profile updated successfully." });
      setForm({});
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err?.message ?? "Failed to update profile." });
    },
  });

  const changePwMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post<{ success: boolean }>("/portal/change-password", data),
    onSuccess: () => {
      toast({ description: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwError("");
      clearMustChangePassword();
    },
    onError: (err: any) => {
      setPwError(err?.message ?? "Failed to change password.");
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const merged = { ...profile, ...form };
    updateMutation.mutate({
      firstName: merged.firstName ?? undefined,
      lastName: merged.lastName ?? undefined,
      phoneNumber: merged.phoneNumber ?? undefined,
      address: merged.address ?? undefined,
      country: merged.country ?? undefined,
      website: merged.website ?? undefined,
    } as any);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    changePwMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  }

  const current = { ...(profile ?? {}), ...form } as AccountProfile;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account information and security settings
        </p>
      </div>

      {isForced && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Password change required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You are using a temporary password. Please update your password below before continuing.
            </p>
          </div>
        </div>
      )}

      <Card className="border-card-border shadow-sm mb-5">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {initials(profile?.name ?? user?.accountName ?? "A")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-foreground">{profile?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {profile?.portalRole ?? "Agent"} &middot; {profile?.status}
                </p>
                <p className="text-sm text-muted-foreground">{profile?.portalEmail ?? profile?.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName ?? profile?.firstName ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName ?? profile?.lastName ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  value={form.phoneNumber ?? profile?.phoneNumber ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+61 4xx xxx xxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input
                  value={form.country ?? profile?.country ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="Australia"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address ?? profile?.address ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={form.website ?? profile?.website ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://your-website.com"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {pwError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pwError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                placeholder="Repeat new password"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changePwMutation.isPending}>
                {changePwMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
