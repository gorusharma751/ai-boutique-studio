'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { orderApi } from '@/lib/api';
import { ShoppingBag, Search, ChevronRight, Truck, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'];

export default function OwnerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [message, setMessage] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getAll({ status: status === 'all' ? undefined : status });
      setOrders(res.data.orders || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [status]);

  const filtered = orders.filter(o =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openOrder = async (o: any) => {
    try {
      const res = await orderApi.getById(o.id);
      setSelected(res.data);
      setNewStatus(o.status);
      setMessage('');
      setTrackingNumber(o.tracking_number || '');
    } catch { toast.error('Failed to load order'); }
  };

  const updateStatus = async () => {
    if (!selected || !newStatus) return;
    setUpdating(true);
    try {
      await orderApi.updateStatus(selected.order.id, { status: newStatus, message, tracking_number: trackingNumber });
      toast.success('Order status updated!');
      setSelected(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
    setUpdating(false);
  };

  const statusIcon: Record<string, any> = {
    pending: Clock, confirmed: CheckCircle, in_production: Package,
    ready: Package, shipped: Truck, delivered: CheckCircle, cancelled: XCircle
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">{orders.length} orders total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 w-52"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${status === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
              >{s.replace('_', ' ')}</button>
            ))}
          </div>
        </div>

        {/* Orders table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No orders found
                  </td></tr>
                ) : filtered.map(o => {
                  const Icon = statusIcon[o.status] || Clock;
                  const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-primary">{o.order_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 text-sm font-semibold">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={`badge-status-${o.status}`}>{o.status.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openOrder(o)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">{selected.order.order_number}</h3>
                <p className="text-sm text-muted-foreground">{selected.order.customer_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-accent">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="rounded-lg bg-muted/30 p-3 mb-4 space-y-2">
              {(Array.isArray(selected.order.items) ? selected.order.items : JSON.parse(selected.order.items || '[]')).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  {item.thumbnail_url && <img src={item.thumbnail_url} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.unit_price}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{item.total}</p>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{parseFloat(selected.order.subtotal).toLocaleString('en-IN')}</span></div>
                {selected.order.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{parseFloat(selected.order.discount_amount).toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>₹{parseFloat(selected.order.total_amount).toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Timeline */}
            {selected.timeline?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Order Timeline</p>
                <div className="space-y-2">
                  {selected.timeline.map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium capitalize">{t.status.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{t.message}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update status */}
            {!['delivered', 'cancelled'].includes(selected.order.status) && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Update Status</p>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {['confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
                {newStatus === 'shipped' && (
                  <input
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number (optional)"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Update message for customer..."
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <button
                  onClick={updateStatus}
                  disabled={updating}
                  className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Updating...' : 'Update Order Status'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
