'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Store, Users, ShoppingBag, TrendingUp, Check, Clock, Sparkles, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const boutiqueStats = data?.stats?.boutiques || [];
  const userStats = data?.stats?.users || [];
  const orderStats = data?.stats?.orders || [];

  const getCount = (arr: any[], status: string) => arr.find((s: any) => s.status === status)?.total || 0;
  const getTotalUsers = () => userStats.reduce((s: number, u: any) => s + parseInt(u.total), 0);
  const getTotalOrders = () => orderStats.reduce((s: number, o: any) => s + parseInt(o.total), 0);

  const summaryCards = [
    { label: 'Total Boutiques', value: boutiqueStats.reduce((s: number, b: any) => s + parseInt(b.total), 0), icon: Store, sub: `${getCount(boutiqueStats, 'pending')} pending`, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Total Users', value: getTotalUsers(), icon: Users, sub: `${getCount(userStats, 'customer')} customers`, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Orders', value: getTotalOrders(), icon: ShoppingBag, sub: `${getCount(orderStats, 'pending')} pending`, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Total Revenue', value: `₹${parseFloat(data?.stats?.total_revenue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, sub: 'All time', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
  ];

  const chartData = (data?.monthly_revenue || []).map((r: any) => ({
    month: new Date(r.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    revenue: parseFloat(r.revenue || 0),
    orders: parseInt(r.orders || 0)
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Platform overview and analytics</p>
          </div>
          <div className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Monthly Revenue (₹)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(262, 83%, 57%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Monthly Orders</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#ec4899" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </div>
        </div>

        {/* Recent Boutiques + Orders */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent boutiques */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Boutiques</h3>
              <Link href="/admin/boutiques" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {(data?.recent_boutiques || []).slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.owner_name}</p>
                  </div>
                  <span className={`badge-status-${b.status} shrink-0`}>{b.status}</span>
                </div>
              ))}
              {!data?.recent_boutiques?.length && (
                <p className="text-sm text-muted-foreground py-4 text-center">No boutiques yet</p>
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Orders</h3>
              <Link href="/admin/orders" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {(data?.recent_orders || []).slice(0, 5).map((o: any) => (
                <div key={o.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.customer_name} • {o.boutique_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</p>
                    <span className={`badge-status-${o.status} text-xs`}>{o.status}</span>
                  </div>
                </div>
              ))}
              {!data?.recent_orders?.length && (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
