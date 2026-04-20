'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, ShoppingBag, User, LogOut, Bell, Menu, X, Sparkles,
  LayoutDashboard, Package, Store, Settings, ChevronDown
} from 'lucide-react';
import useAuthStore from '@/store/authStore';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/customer';

  const navLinks = [
    { label: 'Explore Boutiques', href: '/browse' },
    { label: 'Collections', href: '/browse?type=stitched' },
    { label: 'Custom Orders', href: '/browse?type=custom' },
    { label: 'AI Try-On', href: '/try-on' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:block bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI Boutique
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <button className="h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-accent transition-colors relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">3</span>
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:block max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border bg-popover shadow-lg p-1">
                        <div className="px-3 py-2 border-b mb-1">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                        </div>
                        <Link
                          href={dashboardPath}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors w-full"
                        >
                          <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                        <Link
                          href={`${dashboardPath}/profile`}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors w-full"
                        >
                          <User className="h-4 w-4" /> Profile
                        </Link>
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-accent"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              href={dashboardPath}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
