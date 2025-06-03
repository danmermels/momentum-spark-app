// src/components/nav-menu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarGroup,
} from './ui/sidebar'; // Adjusted to relative path
import { cn } from '@/lib/utils'; // Assuming lib/utils is present

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tasks/new', label: 'Add New Task', icon: PlusCircle },
];

const settingsNavItems = [
   { href: '/settings', label: 'Settings', icon: SettingsIcon },
];


export function NavMenu() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className={cn(
                  pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                tooltip={item.label}
              >
                <a>
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
      <SidebarGroup className="mt-auto">
         <SidebarGroupLabel>Configuration</SidebarGroupLabel>
         {settingsNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className={cn(
                  pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                tooltip={item.label}
              >
                <a>
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
