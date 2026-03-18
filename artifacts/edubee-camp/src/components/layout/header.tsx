import { useAuth } from "@/hooks/use-auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, Globe, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export function Header() {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (!user) return null;

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover-elevate" />
        <div className="hidden sm:block">
          <h2 className="text-lg font-semibold tracking-tight text-foreground font-display">
            {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Portal
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover-elevate rounded-full">
              <Globe className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => handleLangChange('en')}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLangChange('ko')}>한국어</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLangChange('ja')}>日本語</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLangChange('th')}>ไทย</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="hover-elevate rounded-full relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <Badge className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-none">
              3
            </Badge>
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover-elevate p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl || ''} alt={user.fullName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 shadow-xl border-border/50">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-2 cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-2 cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
