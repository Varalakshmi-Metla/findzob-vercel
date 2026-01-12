"use client";

import React from 'react';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection } from 'firebase/firestore';
import Link from 'next/link';
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
} from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, Users, LogOut, Settings, FileDown, Building } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [allowRedirect, setAllowRedirect] = React.useState(false);
  const firestore = useFirestore();

  const [roleLoading, setRoleLoading] = React.useState(true);
  const [isEmployeeRole, setIsEmployeeRole] = React.useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [selectedPlanFromUrl, setSelectedPlanFromUrl] = React.useState<string>('All');

  const plansCollectionRef = useMemoFirebase(() => (firestore && isEmployeeRole) ? collection(firestore, 'plans') : null, [firestore, isEmployeeRole]);
  const plansRes = useCollection(plansCollectionRef as any);
  const plansData = plansRes?.data || [];

  React.useEffect(() => {
    const t = setTimeout(() => setAllowRedirect(true), 1200);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !firestore) {
        if (mounted) {
          setIsEmployeeRole(null);
          setRoleLoading(false);
        }
        return;
      }
      try {
        setRoleLoading(true);
        const ref = doc(firestore, 'users', (user as any).uid);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (snap.exists()) {
          const data = snap.data() || {};
          const isEmployee = (data as any).role === 'employee' || Boolean((data as any).isEmployee === true);
          const isAdmin = (data as any).role === 'admin' || Boolean((data as any).isAdmin === true);
          setIsEmployeeRole(isEmployee || isAdmin);
        } else {
          try {
            const idTok = await (user as any).getIdTokenResult();
            const claims = idTok?.claims || {};
            const claimIsEmployee = claims.role === 'employee' || claims.employee === true;
            const claimIsAdmin = claims.role === 'admin' || claims.admin === true;
            if (mounted) setIsEmployeeRole(Boolean(claimIsEmployee || claimIsAdmin));
          } catch (er) {
            if (mounted) setIsEmployeeRole(false);
          }
        }
      } catch (e) {
        if (mounted) setIsEmployeeRole(false);
      } finally {
        if (mounted) setRoleLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, firestore]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search).get('plan') || 'All';
      setSelectedPlanFromUrl(sp);
    }
  }, []);

  const handlePlanChange = (plan: string) => {
    try {
      const qs = new URLSearchParams((typeof window !== 'undefined') ? window.location.search : '');
      if (!plan || plan === 'All') qs.delete('plan'); else qs.set('plan', plan);
      const q = qs.toString();
      if (typeof window !== 'undefined') setSelectedPlanFromUrl(plan || 'All');
      router.push(pathname + (q ? `?${q}` : ''));
    } catch (e) {
      if (!plan || plan === 'All') router.push(pathname || '/employee/dashboard'); else router.push(pathname + `?plan=${encodeURIComponent(plan)}`);
    }
  };

  React.useEffect(() => {
    if (!isUserLoading && allowRedirect && !roleLoading) {
      if (!user) return router.replace('/login');
      if (isEmployeeRole === null) return;
      if (!isEmployeeRole) router.replace('/');
    }
  }, [user, isUserLoading, router, allowRedirect, roleLoading, isEmployeeRole]);

  if (isUserLoading) return <div className="p-6">Loading...</div>;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'E';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    try { await auth.signOut(); } catch (e) {}
    router.push('/');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-2 flex items-center border-b md:border-auto">
            <div className="flex items-center gap-2">
              <LayoutDashboard />
              <h1 className="text-lg font-medium">FindZob</h1>
            </div>
            <SidebarTrigger className="ml-auto" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/employee/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/employee/my-users">
                    <Users />
                    <span>My Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/employee/users-queue">
                    <Users />
                    <span>Users Queue</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/employee/requests">
                    <FileDown />
                    <span>Requests</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/employee/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              {/* REMOVED DUPLICATE SETTINGS BUTTON - Only keep Logout */}
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
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-sm font-semibold truncate">{user?.displayName?.toUpperCase()}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                {user?.uid && (
                  <span className="text-xs text-muted-foreground/70 truncate mt-0.5 font-mono">
                    ID: {user.uid}
                  </span>
                )}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="p-2 flex items-center justify-between border-b md:hidden">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <LayoutDashboard />
                <h1 className="text-lg font-medium">Employee</h1>
              </div>
              {user?.uid && (
                <span className="text-xs text-muted-foreground/70 font-mono ml-7">
                  ID: {user.uid}
                </span>
              )}
            </div>
            <SidebarTrigger />
          </header>
          <div className="p-4">{children}</div>
        </SidebarInset>
      </div>
      {/* REMOVED SETTINGS MODAL COMPLETELY - No more overlapping */}
    </SidebarProvider>
  );
}