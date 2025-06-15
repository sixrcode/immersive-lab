"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutDashboard, Sparkles, ScanText, Kanban, Users, Film, Settings, LogOut, LayoutGrid } from 'lucide-react'; // Added LayoutGrid
import { cn } from '@/lib/utils'; // Added LayoutGrid
import { Skeleton } from '../ui/skeleton';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/prompt-to-prototype', label: 'Prompt to Prototype', icon: Sparkles },
  { href: '/storyboard-studio', label: 'AI Storyboard Studio', icon: LayoutGrid },
  { href: '/script-analyzer', label: 'Script Analyzer', icon: ScanText },
  { href: '/production-board', label: 'Production Board', icon: Kanban },
  { href: '/collaboration', label: 'Collaboration', icon: Users },
  { href: '/portfolio', label: 'Portfolio Showcase', icon: Film },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-40 group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>
        <div className="mx-2 my-2 h-px w-auto bg-sidebar-border group-data-[collapsible=icon]:mx-auto" />
        <SidebarContent className="p-2">
          <SidebarMenu>
            {[...Array(navItems.length)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuButton
                  asChild
                  tooltip={{ children: "Loading...", side: 'right', align: 'center' }}
                  className="flex items-center"
                >
                  <a>
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="ml-2 h-5 flex-grow group-data-[collapsible=icon]:hidden" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <div className="mx-2 my-2 h-px w-auto bg-sidebar-border group-data-[collapsible=icon]:mx-auto" />
        <SidebarFooter className="p-4 mt-auto">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-full mt-2 group-data-[collapsible=icon]:px-2" />
          <Skeleton className="h-8 w-full mt-2 group-data-[collapsible=icon]:px-2" />
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-col items-center">
        <Link href="/" className="flex flex-col items-center gap-2 mb-4">
          {/* Text and new SIXR Logo */}
          <span className="flex items-center gap-2">
            <Image src="/images/sixr-logo.png" alt="SIXR Logo" width={32} height={32} style={{ objectFit: 'contain' }} />
            <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Immersive Storytelling Lab
            </h1>
          </span>
        </Link>
      </SidebarHeader>
      <div className="mx-2 my-2 h-px w-auto bg-sidebar-border group-data-[collapsible=icon]:mx-auto" />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  className={cn(
                    pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                  asChild
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                >
                  <span className="flex items-center w-full">
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">{item.label}</span>
                  </span>

                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="mx-2 my-2 h-px w-auto bg-sidebar-border group-data-[collapsible=icon]:mx-auto" />
      <SidebarFooter className="p-4 mt-auto">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>CV</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium">User Name</span>
            <span className="text-xs text-muted-foreground">user@example.com</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start mt-2 group-data-[collapsible=icon]:px-2">
          <Settings className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive-foreground hover:bg-destructive group-data-[collapsible=icon]:px-2">
          <LogOut className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
