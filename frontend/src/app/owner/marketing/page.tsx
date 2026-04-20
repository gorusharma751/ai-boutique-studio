'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { marketingApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Tag, Mail, Plus, Send, ToggleLeft, ToggleRight, Trash2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarketingPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'coupons' | 'campaigns'>('coupons');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage', value: '', min_order_amount: '', max_discount: '', usage_limit: '', expires_at: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', subject: '', content: '' });
  const [sending, setSending] = useState('');

  const boutiqueId = user?.boutique_id;

  useEffect(() => {
    if (!boutiqueId) return;
    if (tab === 'coupons') {
      marketingApi.getCoupons(boutiqueId).then(r => setCoupons(r.data.coupons || [])).catch(() => {});
    } else {
      marketingApi.getCampaigns(boutiqueId).then(r => setCampaigns(r.data.campaigns || [])).catch(() => {});
    }
  }, [tab, boutiqueId]);

  const createCoupon = async () => {
    if (!couponForm.code || !couponForm.value) return toast.error('Code and value are required');
    try {
      await marketingApi.createCoupon({ ...couponForm, boutique_id: boutiqueId, value: parseFloat(couponForm.value), min_order_amount: parseFloat(couponForm.min_order_amount || '0') });
      toast.success('Coupon created!');
      setShowCouponForm(false);
      setCouponForm({ code: '', type: 'percentage', value: '', min_order_amount: '', max_discount: '', usage_limit: '', expires_at: '' });
      marketingApi.getCoupons(boutiqueId!).then(r => setCoupons(r.data.coupons || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create coupon');
    }
  };

  const toggleCoupon = async (id: string, is_active: boolean) => {
    try {
      await marketingApi.toggleCoupon(id, !is_active);
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
    } catch { toast.error('Failed to toggle coupon'); }
  };

  const createCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.content) return toast.error('All fields required');
    try {
      await marketingApi.createCampaign({ ...campaignForm, boutique_id: boutiqueId });
      toast.success('Campaign created!');
      setShowCampaignForm(false);
      setCampaignForm({ name: '', subject: '', content: '' });
      marketingApi.getCampaigns(boutiqueId!).then(r => setCampaigns(r.data.campaigns || []));
    } catch { toast.error('Failed to create campaign'); }
  };

  const sendCampaign = async (id: string) => {
    if (!confirm('Send this campaign to all your customers?')) return;
    setSending(id);
    try {
      const res = await marketingApi.sendCampaign(id);
      toast.success(res.data.message);
      marketingApi.getCampaigns(boutiqueId!).then(r => setCampaigns(r.data.campaigns || []));
    } catch { toast.error('Failed to send campaign'); }
    setSending('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Marketing Tools</h1>
            <p className="text-sm text-muted-foreground">Grow your boutique with coupons and email campaigns</p>
          </div>
          <button
            onClick={() => tab === 'coupons' ? setShowCouponForm(true) : setShowCampaignForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> {tab === 'coupons' ? 'Create Coupon' : 'Create Campaign'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {[{ key: 'coupons', label: 'Coupons', icon: Tag }, { key: 'campaigns', label: 'Email Campaigns', icon: Mail }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Coupons */}
        {tab === 'coupons' && (
          <div className="space-y-3">
            {coupons.length === 0 ? (
              <div className="text-center py-16 rounded-xl border-2 border-dashed">
                <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No coupons yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create discount coupons for your customers</p>
              </div>
            ) : coupons.map(c => (
              <div key={c.id} className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-bold font-mono bg-muted px-2 py-0.5 rounded">{c.code}</code>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    {c.min_order_amount > 0 && <span>Min order: ₹{c.min_order_amount}</span>}
                    {c.usage_limit && <span>Limit: {c.used_count}/{c.usage_limit} used</span>}
                    {c.expires_at && <span>Expires: {new Date(c.expires_at).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleCoupon(c.id, c.is_active)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title={c.is_active ? 'Deactivate' : 'Activate'}>
                    {c.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Code copied!'); }}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaigns */}
        {tab === 'campaigns' && (
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-16 rounded-xl border-2 border-dashed">
                <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mt-1">Send email campaigns to your customers</p>
              </div>
            ) : campaigns.map(c => (
              <div key={c.id} className="rounded-xl border bg-card p-4 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700'
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.subject}</p>
                  {c.status === 'sent' && (
                    <p className="text-xs text-muted-foreground mt-1">Sent to {c.sent_count} of {c.recipients_count} recipients</p>
                  )}
                </div>
                {c.status === 'draft' && (
                  <button
                    onClick={() => sendCampaign(c.id)}
                    disabled={sending === c.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0 transition-colors"
                  >
                    <Send className="h-3 w-3" /> {sending === c.id ? 'Sending...' : 'Send'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      {showCouponForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Create Coupon</h3>
            <div className="space-y-3">
              {[
                { key: 'code', label: 'Coupon Code *', placeholder: 'SAVE20', type: 'text' },
                { key: 'value', label: 'Discount Value *', placeholder: '20', type: 'number' },
                { key: 'min_order_amount', label: 'Min Order Amount', placeholder: '500', type: 'number' },
                { key: 'max_discount', label: 'Max Discount (₹)', placeholder: '500', type: 'number' },
                { key: 'usage_limit', label: 'Usage Limit', placeholder: 'Unlimited', type: 'number' },
                { key: 'expires_at', label: 'Expires At', placeholder: '', type: 'datetime-local' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={(couponForm as any)[f.key]} onChange={e => setCouponForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={couponForm.type} onChange={e => setCouponForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCouponForm(false)} className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                <button onClick={createCoupon} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-lg">
            <h3 className="font-semibold mb-4">Create Email Campaign</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Campaign Name *</label>
                <input value={campaignForm.name} onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Summer Sale 2024" className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Subject *</label>
                <input value={campaignForm.subject} onChange={e => setCampaignForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="🎉 Exclusive Summer Sale - Up to 40% Off!" className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Content (HTML supported) *</label>
                <textarea value={campaignForm.content} onChange={e => setCampaignForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your email content here..." rows={6}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCampaignForm(false)} className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                <button onClick={createCampaign} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Save Draft</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
