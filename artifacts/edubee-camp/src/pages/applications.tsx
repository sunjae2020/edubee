import { useState } from "react";
import { useListApplications, useCreateApplication, CreateApplicationRequest } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { Search, Plus, Filter, MoreHorizontal, FileText, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const createSchema = z.object({
  primaryLanguage: z.string().min(2),
  totalChildren: z.coerce.number().min(1),
  totalAdults: z.coerce.number().min(0),
  preferredStartDate: z.string().optional(),
});

export default function Applications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: appsData, isLoading } = useListApplications({
    query: {
      queryKey: ['/api/applications', { search: searchTerm, status: statusFilter === 'all' ? undefined : statusFilter }]
    }
  });

  const createMut = useCreateApplication();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      primaryLanguage: "en",
      totalChildren: 1,
      totalAdults: 1,
    }
  });

  const onSubmit = async (data: z.infer<typeof createSchema>) => {
    try {
      const payload: CreateApplicationRequest = {
        ...data,
        status: "pending",
        termsAccepted: false
      };
      await createMut.mutateAsync({ data: payload });
      toast({ title: "Success", description: "Application created successfully" });
      setIsCreateOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create application" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-1">Manage and track student enrollments.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate active-elevate-2 font-semibold shadow-md shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
              <DialogDescription>Start a new enrollment application process.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="totalChildren" render={({field}) => (
                    <FormItem>
                      <FormLabel>Children</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="totalAdults" render={({field}) => (
                    <FormItem>
                      <FormLabel>Adults</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="primaryLanguage" render={({field}) => (
                  <FormItem>
                    <FormLabel>Primary Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="th">Thai</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="pt-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="mr-2">Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60 shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between bg-muted/10">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ID or applicant..." 
              className="pl-9 h-10 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-10 bg-background">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="contracted">Contracted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : appsData?.data.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">No applications found</h3>
              <p className="text-muted-foreground max-w-sm mt-1">We couldn't find any applications matching your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="px-6 py-4 font-semibold">App ID</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Participants</th>
                    <th className="px-6 py-4 font-semibold">Language</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {appsData?.data.map((app) => (
                    <tr key={app.id} className="bg-card hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {app.applicationNumber || `#APP-${app.id.substring(0,6).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{app.totalChildren + app.totalAdults} Total</span>
                        <span className="text-xs text-muted-foreground block">
                          ({app.totalChildren}C, {app.totalAdults}A)
                        </span>
                      </td>
                      <td className="px-6 py-4 uppercase font-medium text-muted-foreground">
                        {app.primaryLanguage}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover-elevate">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem asChild>
                              <Link href={`/applications/${app.id}`} className="cursor-pointer flex items-center">
                                View Details <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Edit Info</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Mock UI */}
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground bg-muted/5">
            <div>Showing <span className="font-medium text-foreground">{appsData?.data.length || 0}</span> results</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled className="h-8">Previous</Button>
              <Button variant="outline" size="sm" disabled className="h-8">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
