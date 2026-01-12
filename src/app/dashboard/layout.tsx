'use client';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Briefcase,
  Home,
  LogOut,
  User,
  Zap,
  FileText,
  CreditCard,
  Settings,
  Shield,
  Bell,
  Lightbulb,
  Award,
  TrendingUp,
  Menu,
} from 'lucide-react';
import { useAuth, useDoc, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UnpaidInvoicesBlock } from '@/components/UnpaidInvoicesBlock';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/resumes', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/applications', icon: Briefcase, label: 'Applications' },
  { href: '/dashboard/interview-prep', icon: Lightbulb, label: 'Interview Prep' },
  { href: '/dashboard/hot-jobs', icon: TrendingUp, label: 'Jobs' },
  { href: '/dashboard/recommended-jobs', icon: Award, label: 'Recommended Jobs' },
];

const bottomNavItems = [
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/invoices', icon: Zap, label: 'Invoices' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

import type { UserPlan } from '@/types/firestore-schemas';

type DashboardUserDoc = {
  isAdmin?: boolean;
  profileCompleted?: boolean;
  photoURL?: string;
  role?: string;
  isEmployee?: boolean;
  plans?: UserPlan[];
  activePlan?: string;
  email?: string;
  displayName?: string;
};

// Custom link component that closes sidebar on mobile after navigation
function NavLink({ href, children, className, onClick }: { href: string; children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const { isMobile, setOpenMobile } = useSidebar();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    // Close mobile sidebar after link click
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  // no dialog: enforce redirect to profile when incomplete

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc<DashboardUserDoc>(userDocRef);

  const isAdmin = isAdminEmail(user?.email) || userData?.isAdmin === true;
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    if (!isUserLoading && user && isAdmin) {
      router.push('/admin');
      return;
    }
    // If the user is an employee, redirect them to the employee area, but avoid infinite loop
    if (!isUserLoading && user && !isAdmin) {
      const role = userData?.role || (user as any).customClaims?.role || (user as any).role;
      const isEmployee = role === 'employee' || (user as any).customClaims?.employee === true || userData?.isEmployee === true;
      if (isEmployee && pathname !== '/employee/dashboard') {
        router.push('/employee/dashboard');
      }
    }
  }, [user, isUserLoading, isAdmin, userData, router, pathname]);


  // Plan expiry modal state
  const [showPlanExpired, setShowPlanExpired] = useState(false);
  useEffect(() => {
    if (!isUserDataLoading && userData) {
      // If profile is not complete, force navigation to profile page so the user cannot access other dashboard pages
      if (!userData.profileCompleted && pathname !== '/dashboard/profile') {
        router.replace('/dashboard/profile');
        return;
      }
      // Check for plan expiry
      if (Array.isArray(userData.plans)) {
        // Find the active plan (by activePlan id or last in array)
        let activePlan = null;
        if (userData.activePlan) {
          activePlan = userData.plans.find((p) => p.planId === userData.activePlan) || null;
        }
        if (!activePlan && userData.plans.length > 0) {
          activePlan = userData.plans[userData.plans.length - 1];
        }
        if (activePlan && activePlan.expiryDate && activePlan.expiryDate !== 'lifetime') {
          const expiry = new Date(activePlan.expiryDate);
          const now = new Date();
          if (expiry < now && pathname !== '/dashboard/billing') {
            setShowPlanExpired(true);
            // Don't redirect, just show modal
            return;
          } else {
            setShowPlanExpired(false);
          }
        } else {
          setShowPlanExpired(false);
        }
      } else {
        setShowPlanExpired(false);
      }
    }
  }, [userData, isUserDataLoading, pathname, router]);

  const showLoadingScreen = isUserLoading || (user && isUserDataLoading) || isAdmin;

  if (showLoadingScreen) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  const handleLogout = () => {
    auth.signOut();
    router.push('/');
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Smooth navigation with default link behavior
    // Router will automatically handle the navigation
    window.scrollTo(0, 0);
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          {/* ...existing code... */}
          <SidebarHeader className="p-1.5 sm:p-2 md:p-3 flex items-center justify-between gap-1 sm:gap-2 border-b md:border-none bg-gradient-to-r from-primary/5 to-transparent">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-primary font-headline truncate">FindZob</h1>
            <SidebarTrigger className="ml-auto flex-shrink-0" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-md hover:bg-accent transition-colors duration-200 h-9 sm:h-10"
                    >
                      <NavLink href={item.href} className="flex items-center gap-2 w-full">
                        <Icon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-xs font-medium truncate">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu className="space-y-0.5">
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-md hover:bg-accent transition-colors duration-200 h-9 sm:h-10">
                    <NavLink href="/admin" className="flex items-center gap-2 w-full">
                      <Shield className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="text-xs sm:text-xs font-medium truncate">Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-md hover:bg-accent transition-colors duration-200 h-9 sm:h-10"
                    >
                      <NavLink href={item.href} className="flex items-center gap-2 w-full">
                        <Icon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-xs font-medium truncate">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-md hover:bg-accent transition-colors duration-200 h-9 sm:h-10">
                  <div className="flex items-center gap-2 w-full">
                    <LogOut className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-xs font-medium truncate">Logout</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="p-1 sm:p-2 flex items-center gap-1 sm:gap-2 border-t mt-2">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage src={userData?.photoURL || user?.photoURL || ''} />
                <AvatarFallback className="text-xs sm:text-sm">{getInitials(user?.displayName?.toUpperCase())}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-xs sm:text-sm font-semibold truncate">{user?.displayName?.toUpperCase()}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="p-2 sm:p-3 flex items-center justify-between border-b md:hidden bg-gradient-to-r from-primary/5 to-transparent">
            <h1 className="text-sm sm:text-base font-bold text-primary font-headline">FindZob</h1>
            <div className="flex items-center gap-1 sm:gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-secondary">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
              <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/15 border border-primary/20 hover:border-primary/40 transition-all duration-200 ml-1 sm:ml-2 flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5 [&_svg]:text-primary hover:[&_svg]:text-primary/80 [&_svg]:transition-colors duration-200">
                <Menu />
              </SidebarTrigger>
            </div>
          </header>
          <div className="relative flex-1">
            <div className="absolute top-4 right-4 hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Bell />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
            <UnpaidInvoicesBlock>
              {children}
            </UnpaidInvoicesBlock>
            {/* Plan Expired Modal */}
            {showPlanExpired && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full flex flex-col items-center">
                  <h2 className="text-lg font-bold mb-2 text-red-600">Your plan has expired</h2>
                  <p className="mb-4 text-center">To continue using premium features, please activate a plan.</p>
                  <Button onClick={() => router.push('/dashboard/billing')} className="w-full">Go to Billing</Button>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
      {/* Profile completeness is enforced via redirect in the effect above. */}
    </SidebarProvider>
  );
}
