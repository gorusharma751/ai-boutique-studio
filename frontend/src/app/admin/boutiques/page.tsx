'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminApi } from '@/lib/api';
import { Store, Search, CheckCircle, XCircle, PauseCircle, Eye, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['all', 'pending', 'active', 'suspended', 'rejected'];

export default function AdminBoutiques() {
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedBoutique, setSelectedBoutique] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [creditsModal, setCreditsModal] = useState<any>(null);
  const [creditsAmount, setCreditsAmount] = useState(50);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBoutiques({ page, limit: 15, status: status === 'all' ? undefined : status, search: search || undefined });
      setBoutiques(res.data.boutiques);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page, status, search]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id + newStatus);
    try {
      await adminApi.updateBoutiqueStatus(id, { status: newStatus });
      toast.success(`Boutique ${newStatus}`);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setActionLoading('');
  };

  const addCredits = async () => {
    if (!creditsModal) return;
    try {
      await adminApi.addCredits(creditsModal.id, { credits: creditsAmount, reason: 'Admin bonus' });
      toast.success(`${creditsAmount} credits added!`);
      setCreditsModal(null);
      setCreditsAmount(50);
    } catch {
      toast.error('Failed to add credits');
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Boutiques Management</h1>
            <p className="text-sm text-muted-foreground">{total} boutiques total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search boutiques..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  status === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  {['Boutique', 'Owner', 'City', 'Products', 'Status', 'Credits', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
                  ))
                ) : boutiques.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No boutiques found</td></tr>
                ) : boutiques.map(b => (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">/{b.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p>{b.owner_name}</p>
                      <p className="text-xs text-muted-foreground">{b.owner_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{b.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center">{b.product_count || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-status-${b.status}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>{b.ai_credits || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {b.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(b.id, 'active')}
                            disabled={actionLoading === b.id + 'active'}
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {b.status === 'active' && (
                          <button
                            onClick={() => updateStatus(b.id, 'suspended')}
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 transition-colors"
                            title="Suspend"
                          >
                            <PauseCircle className="h-4 w-4" />
                          </button>
                        )}
                        {(b.status === 'suspended' || b.status === 'rejected') && (
                          <button
                            onClick={() => updateStatus(b.id, 'active')}
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                            title="Reactivate"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(b.id, 'rejected')}
                            className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setCreditsModal(b)}
                          className="p-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 transition-colors"
                          title="Add Credits"
                        >
                          <Sparkles className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Showing {boutiques.length} of {total}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 hover:bg-accent">Prev</button>
                <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 hover:bg-accent">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Credits Modal */}
      {creditsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-1">Add AI Credits</h3>
            <p className="text-sm text-muted-foreground mb-4">Adding credits to: <strong>{creditsModal.name}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Credits to add</label>
                <input
                  type="number"
                  value={creditsAmount}
                  onChange={e => setCreditsAmount(parseInt(e.target.value))}
                  min={1}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2">
                {[50, 100, 200, 500].map(v => (
                  <button key={v} onClick={() => setCreditsAmount(v)} className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${creditsAmount === v ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>{v}</button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setCreditsModal(null)} className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                <button onClick={addCredits} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Add Credits</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
