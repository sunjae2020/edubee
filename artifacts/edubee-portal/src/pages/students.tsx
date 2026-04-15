import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronRight, Users } from "lucide-react";
import { useState } from "react";

interface StudentAccount {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  country: string | null;
  status: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  quoteCount: number;
  latestQuoteStatus: string | null;
  latestQuoteRef: string | null;
  createdOn: string;
}

function statusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "active" || s === "accepted") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "draft") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "cancelled" || s === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground border-border";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ["portal-students"],
    queryFn: () => api.get<{ data: StudentAccount[] }>("/portal/students").then((r) => r.data),
  });

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.country?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Students linked to your agency account
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{students.length} student{students.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or country..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-4">
          Failed to load students. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {search ? "No students match your search" : "No students found"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Students will appear here once quotes are linked to your account"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => (
            <Link key={student.id} href={`/students/${student.id}`}>
              <div className="block">
                <Card className="border-card-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                          {initials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(student.status)}`}>
                            {student.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {student.email && (
                            <span className="text-xs text-muted-foreground truncate">{student.email}</span>
                          )}
                          {student.country && (
                            <span className="text-xs text-muted-foreground">{student.country}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{student.quoteCount} quote{student.quoteCount !== 1 ? "s" : ""}</p>
                        {student.latestQuoteStatus && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(student.latestQuoteStatus)}`}>
                            {student.latestQuoteStatus}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
