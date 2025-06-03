
// src/components/app-layout.tsx
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  // SidebarTrigger is used within SiteHeader, which is part of this layout
} from '@/components/ui/sidebar';
import SiteHeader from './site-header'; // Relative path for sibling
import { NavMenu } from './nav-menu';   // Relative path for sibling
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="items-center justify-center gap-2 p-4">
          <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline text-lg">Momentum Spark</span>
          </Link>
          <Link href="/" className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
             <Sparkles className="h-6 w-6 text-primary" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <NavMenu />
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Can add a user profile or logout button here */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
