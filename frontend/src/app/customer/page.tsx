'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { orderApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { ShoppingBag, Wand2, MessageSquare, Ruler, ArrowRight, Package } from 'lucide-react';
import Link from 'next/link';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getAll({ limit: 5 })
      .then(r => setOrders(r.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { href: '/browse', icon: Package, label: 'Browse Boutiques', desc: 'Discover new styles', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { href: '/customer/try-on', icon: Wand2, label: 'AI Virtual Try-On', desc: 'See before you buy', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
    { href: '/customer/chatbot', icon: MessageSquare, label: 'Fashion Chatbot', desc: 'Get style advice', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { href: '/customer/measurements', icon: Ruler, label: 'My Measurements', desc: 'For perfect fit', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-6 text-white">
          <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}! 👗</h1>
          <p className="text-purple-200 mt-1">Discover beautiful outfits and try them on virtually</p>
          <Link href="/browse" className="inline-flex items-center gap-2 mt-4 bg-white text-purple-600 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-purple-50 transition-colors">
            Explore Boutiques <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="rounded-xl border bg-card p-4 hover:shadow-md transition-all group">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${link.color} mb-3`}>
                <link.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Go <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/customer/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet. Start exploring boutiques!</p>
              <Link href="/browse" className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline">
                Browse boutiques <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <Link key={o.id} href={`/customer/orders/${o.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{o.boutique_name} • {new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                    <span className={`badge-status-${o.status} text-xs`}>{o.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
