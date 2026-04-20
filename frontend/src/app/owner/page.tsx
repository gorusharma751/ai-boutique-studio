'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { boutiqueApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import {
  ShoppingBag, Package, Users, Sparkles, TrendingUp, ArrowUpRight,
  Clock, CheckCircle, Truck, AlertCircle, Plus, Store
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.boutique_id) {
      boutiqueApi.getDashboard(user.boutique_id)
        .then(r => setData(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user?.boutique_id) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Store className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Set Up Your Boutique</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">Create your boutique profile to start selling and using AI features</p>
          </div>
          <Link href="/owner/profile" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Create Boutique
          </Link>
          {user?.boutique_status === 'pending' && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-lg">
              <Clock className="h-4 w-4" />
              Your boutique is pending admin approval
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats || {};
  const orderStatuses = stats.orders || [];
  const getOrderCount = (status: string) => parseInt(orderStatuses.find((o: any) => o.status === status)?.total || '0');

  const summaryCards = [
    { label: 'Total Revenue', value: `₹${parseFloat(stats.total_revenue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, sub: 'All paid orders', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Orders', value: orderStatuses.reduce((s: number, o: any) => s + parseInt(o.total), 0), icon: ShoppingBag, sub: `${getOrderCount('pending')} pending`, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Products', value: stats.total_products || 0, icon: Package, sub: 'Active listings', color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'AI Credits', value: stats.ai_credits || 0, icon: Sparkles, sub: 'Remaining', color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
  ];

  const orderStatusCards = [
    { label: 'Pending', count: getOrderCount('pending'), icon: Clock, color: 'text-yellow-500' },
    { label: 'Confirmed', count: getOrderCount('confirmed'), icon: CheckCircle, color: 'text-blue-500' },
    { label: 'In Production', count: getOrderCount('in_production'), icon: AlertCircle, color: 'text-orange-500' },
    { label: 'Shipped', count: getOrderCount('shipped'), icon: Truck, color: 'text-purple-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(' ')[0]}!</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user.boutique_name}
              {user.boutique_status !== 'active' && (
                <span className="ml-2 text-amber-500 font-medium">({user.boutique_status})</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/owner/products/new" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Add Product
            </Link>
          </div>
        </div>

        {/* Low credit warning */}
        {(stats.ai_credits || 0) < 10 && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Low AI Credits!</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">You have only {stats.ai_credits} credits left. Buy more to keep AI features running.</p>
            </div>
            <Link href="/owner/credits" className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors shrink-0">
              Buy Credits
            </Link>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
                <div className={`p-2 rounded-xl ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order status breakdown */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Order Status</h3>
            <Link href="/owner/orders" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Manage orders <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {orderStatusCards.map(s => (
              <div key={s.label} className="rounded-lg bg-muted/40 p-3 text-center">
                <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link href="/owner/orders" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : (data?.recent_orders || []).length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders yet. Share your boutique link to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.recent_orders || []).map((order: any) => (
                <Link key={order.id} href={`/owner/orders/${order.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                    <span className={`badge-status-${order.status} text-xs`}>{order.status}</span>
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
