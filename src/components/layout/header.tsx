
"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from 'lucide-react';
import { AppSidebar } from './sidebar'; // Import AppSidebar for mobile view

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col">
             {/* Render a simplified or full sidebar content here for mobile */}
             {/* This is a placeholder for a mobile-optimized sidebar content. */}
             {/* For now, we re-use AppSidebar, but it might need adjustments for mobile UX. */}
            <AppSidebar />
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden md:block">
        <SidebarTrigger />
      </div>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {/* Placeholder for additional header items like search or notifications */}
        {/* <Search className="h-5 w-5 text-muted-foreground" /> */}
        {/* <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
        </Button> */}
      </div>
    </header>
  );
}
