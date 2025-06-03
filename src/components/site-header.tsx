
// src/components/site-header.tsx
"use client";

import Link from 'next/link';
import { SidebarTrigger, SidebarContext } from '@/components/ui/sidebar';
import { Sparkles } from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';

// This sub-component will only be rendered on the client side after mount,
// and it's the one that will safely call useSidebar (indirectly via SidebarTrigger's context check).
const SiteHeaderClientActions = () => {
  const sidebarContext = useContext(SidebarContext); // Directly use SidebarContext
  if (!sidebarContext) {
    // console.warn("SiteHeaderClientActions: SidebarContext not available during this render pass.");
    return null; // If context isn't there (e.g. very early SSR pass), render nothing
  }
  const { isMobile } = sidebarContext;

  // Only render the trigger if it's mobile view
  if (!isMobile) {
    return null;
  }
  return <SidebarTrigger />;
};

export default function SiteHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold font-headline text-lg">Momentum Spark</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Only render the client-side actions (including SidebarTrigger) after component has mounted */}
          {mounted ? <SiteHeaderClientActions /> : null}
        </div>
      </div>
    </header>
  );
}
