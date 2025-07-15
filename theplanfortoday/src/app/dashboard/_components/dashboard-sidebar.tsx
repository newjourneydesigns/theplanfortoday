"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Logo } from '@/components/logo';
import { Settings, Home, Users, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';


const teams = [
    { name: 'Team 1: Marketing', plans: ['Q3 Launch Campaign', 'Stealth Project X', 'Website Redesign'] },
    { name: 'Team 2: Engineering', plans: ['Backend Refactor', 'Feature A Rollout', 'API Documentation'] },
    { name: 'Team 3: Design', plans: ['New UI Kit'] },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
              <Link href="/dashboard">
                <Home />
                Dashboard
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/settings')}>
              <Link href="#">
                <Settings />
                Settings
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="mt-4 flex flex-col gap-2 px-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teams</h3>
            {teams.map((team, index) => (
                <Collapsible key={index}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-2 group">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span className="text-sm font-medium">{team.name}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="pl-8 py-1 space-y-1">
                            {team.plans.map((plan, planIndex) => (
                                <Link key={planIndex} href="#" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>{plan}</span>
                                </Link>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
