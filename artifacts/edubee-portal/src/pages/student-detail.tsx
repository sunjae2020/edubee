import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Globe, MapPin, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

interface StudentDetail {
  account: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    country: string | null;
    status: string;
    firstName: string | null;
    lastName: string | null;
    address: string | null;
    createdOn: string;
    profileImageUrl: string | null;
  };
  quotes: Array<{
    id: string;
    quoteRefNumber: string | null;
    quoteStatus: string;
    expiryDate: string | null;
    notes: string | null;
    createdOn: string;
  }>;
}

function statusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "active" || s === "accepted") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (s === "draft") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (s === "pending" || s === "sent") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (s === "cancelled" || s === "rejected") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-muted text-muted-foreground border border-border";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student", id],
    queryFn: () =>
      api.get<{ data: StudentDetail }>(`/portal/students/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card className="border-card-border mb-4">
          <CardContent className="p-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/students")} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error ? "You do not have permission to view this student, or the student was not found." : "Student not found."}
        </div>
      </div>
    );
  }

  const { account, quotes } = data;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/students")} className="mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Students
      </Button>

      <Card className="border-card-border shadow-sm mb-4">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                {initials(account.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{account.name}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(account.status)}`}>
                  {account.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Student Account</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {account.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{account.email}</span>
              </div>
            )}
            {account.phoneNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{account.phoneNumber}</span>
              </div>
            )}
            {account.country && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <span>{account.country}</span>
              </div>
            )}
            {account.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{account.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Added {format(new Date(account.createdOn), "dd MMM yyyy")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Quotes ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No quotes found for this student.
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <Card key={q.id} className="border-card-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {q.quoteRefNumber ?? q.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {format(new Date(q.createdOn), "dd MMM yyyy")}
                        {q.expiryDate && ` · Expires ${format(new Date(q.expiryDate), "dd MMM yyyy")}`}
                      </p>
                      {q.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{q.notes}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor(q.quoteStatus)}`}>
                      {q.quoteStatus}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
