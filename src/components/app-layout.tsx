// src/components/site-header.tsx
"use client";

import Link from 'next/link';
import { SidebarTrigger, useSidebar } from './ui/sidebar'; // Adjusted path
import { Button } from './ui/button'; // Adjusted path
import { Sparkles } from 'lucide-react';

export default function SiteHeader() {
  const { isMobile } = useSidebar();

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
          {isMobile && <SidebarTrigger />}
        </div>
      </div>
    </header>
  );
}

    