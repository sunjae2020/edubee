import {
  LayoutDashboard,
  Users,
  Package,
  BookOpen,
  FileText,
  FileSignature,
  Receipt,
  ArrowRightLeft,
  Bell,
  Settings,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border bg-sidebar">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary hover-elevate rounded-lg p-1">
          <GraduationCap className="h-6 w-6" />
          Edubee Camp
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4 gap-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-sidebar-foreground/50">{t('dashboard')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard" className="hover-elevate active-elevate-2 font-medium">
                    <LayoutDashboard />
                    <span>{t('dashboard')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-sidebar-foreground/50">{t('crm')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/leads")}>
                  <Link href="/leads" className="hover-elevate active-elevate-2 font-medium">
                    <Users />
                    <span>{t('leads')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/applications")}>
                  <Link href="/applications" className="hover-elevate active-elevate-2 font-medium">
                    <FileText />
                    <span>{t('applications')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-sidebar-foreground/50">{t('contracts')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/contracts")}>
                  <Link href="/contracts" className="hover-elevate active-elevate-2 font-medium">
                    <FileSignature />
                    <span>{t('contracts')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-sidebar-foreground/50">{t('finance')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/finance/invoices")}>
                  <Link href="/finance/invoices" className="hover-elevate active-elevate-2 font-medium">
                    <Receipt />
                    <span>{t('invoices')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/finance/transactions")}>
                  <Link href="/finance/transactions" className="hover-elevate active-elevate-2 font-medium">
                    <ArrowRightLeft />
                    <span>{t('transactions')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-sidebar-foreground/50">{t('admin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/users")}>
                    <Link href="/users" className="hover-elevate active-elevate-2 font-medium">
                      <ShieldAlert />
                      <span>{t('users')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/packages")}>
                    <Link href="/packages" className="hover-elevate active-elevate-2 font-medium">
                      <Package />
                      <span>{t('packages')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/products")}>
                    <Link href="/products" className="hover-elevate active-elevate-2 font-medium">
                      <BookOpen />
                      <span>{t('products')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/notifications"}>
              <Link href="/notifications" className="hover-elevate active-elevate-2 font-medium">
                <Bell />
                <span>{t('notifications')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
