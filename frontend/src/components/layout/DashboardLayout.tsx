'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, ShoppingBag, Package, Users, CreditCard, BarChart3,
  Settings, Store, MessageSquare, Scissors, Star, Megaphone, Tag,
  LogOut, Bell, Sun, Moon, Sparkles, ChevronRight, Menu, X,
  User, ShoppingCart, Ruler, Wand2, Home, MapPin
} from 'lucide-react';
import useAuthStore from '@/store/authStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Boutiques', href: '/admin/boutiques', icon: Store },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Plans', href: '/admin/plans', icon: CreditCard },
  { label: 'AI Credits', href: '/admin/credits', icon: Sparkles },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const ownerNav: NavItem[] = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { label: 'My Boutique', href: '/owner/profile', icon: Store },
  { label: 'Products', href: '/owner/products', icon: Package },
  { label: 'Orders', href: '/owner/orders', icon: ShoppingBag },
  { label: 'Customers', href: '/owner/customers', icon: Users },
  { label: 'Measurements', href: '/owner/measurements', icon: Ruler },
  { label: 'AI Features', href: '/owner/ai-features', icon: Wand2 },
  { label: 'Marketing', href: '/owner/marketing', icon: Megaphone },
  { label: 'Coupons', href: '/owner/coupons', icon: Tag },
  { label: 'Credits', href: '/owner/credits', icon: Sparkles },
];

const customerNav: NavItem[] = [
  { label: 'Dashboard', href: '/customer', icon: LayoutDashboard },
  { label: 'Browse', href: '/browse', icon: Home },
  { label: 'My Orders', href: '/customer/orders', icon: ShoppingBag },
  { label: 'Measurements', href: '/customer/measurements', icon: Ruler },
  { label: 'AI Try-On', href: '/customer/try-on', icon: Wand2 },
  { label: 'AI Chatbot', href: '/customer/chatbot', icon: MessageSquare },
  { label: 'Profile', href: '/customer/profile', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'owner' ? ownerNav : customerNav;
  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'owner' ? 'Boutique Owner' : 'Customer';
  const roleColor = user?.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : user?.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b shrink-0">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">AI Boutique Studio</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor}`}>{roleLabel}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/owner' && item.href !== '/customer' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
              {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t p-3 space-y-1 shrink-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="sidebar-link w-full"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}
        <button onClick={logout} className="sidebar-link w-full text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User info */}
      <div className="p-3 border-t shrink-0">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">
            <Sidebar />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile) */}
        <header className="flex h-14 lg:hidden items-center gap-3 border-b bg-card px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent">
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Boutique Studio</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
