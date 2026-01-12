
'use client';

import { useUser, useAuth, useMemoFirebase, useDoc } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Building, Settings, Shield, User as UserIcon, LayoutDashboard, FileText, Search, Users, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: UserIcon, label: 'Users Management' },
  { href: '/admin/employees', icon: Users, label: 'Employees Management' },
  { href: '/admin/assign-users', icon: UserIcon, label: 'Assign Users to Employees' },
  { href: '/admin/hot-jobs', icon: Building, label: 'Jobs (USA)' },
  { href: '/admin/hot-jobs/india', icon: Building, label: "Jobs (India)" },
  { href: '/admin/hot-jobs/today-hot-jobs-india', icon: Building, label: " Today's Jobs (India)" },
  { href: '/admin/hot-jobs/today-hot-jobs-usa', icon: Building, label: " Today's Jobs (USA)" },
  { href: '/admin/plans', icon: Shield, label: 'Plans & Billing' },
  { href: '/admin/plan-activation', icon: Zap, label: 'Activate Plans' },
  { href: '/admin/reports', icon: FileText, label: 'Reports' },
  { href: '/admin/scouting', icon: Search, label: 'Scouting' },
  { href: '/admin/applications', icon: FileText, label: 'Applications' },
  { href: '/admin/settings', icon: Settings, label: 'Admin Settings' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Small component rendered inside SidebarProvider so `useSidebar` is available
  function AdminTitle() {
    try {
      const { state } = useSidebar();
      if (state === 'collapsed') return null;
      return <h1 className="text-xl font-bold font-headline">FindZob Admin</h1>;
    } catch (e) {
      // If hook not available yet, show title as fallback
      return <h1 className="text-xl font-bold font-headline">FindZob Admin</h1>;
    }
  }
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const isAdmin = isAdminEmail(user?.email);
  const isCheckingAuth = isUserLoading;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isCheckingAuth && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, isAdmin, isCheckingAuth]);

  const handleLogout = () => {
    auth.signOut();
    router.push('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isCheckingAuth || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-2 flex items-center border-b md:border-none">
             <div className="flex items-center gap-2">
              <Shield />
              <AdminTitle />
            </div>
            <SidebarTrigger className="ml-auto" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
           <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
               <LogOut />
               <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
            <div className="p-2 flex items-center gap-2 border-t mt-2">
                <Avatar>
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback>{getInitials(user?.displayName?.toUpperCase())}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate">{user?.displayName?.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="p-2 flex items-center justify-between border-b md:hidden">
        <div className="flex items-center gap-2">
          <Shield />
          <AdminTitle />
        </div>
                <SidebarTrigger />
            </header>
            {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
