'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { creditApi, paymentApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Sparkles, Zap, Star, Check, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const { user } = useAuthStore();
  const [packages, setPackages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');

  const boutiqueId = user?.boutique_id;

  useEffect(() => {
    if (!boutiqueId) return;
    Promise.all([
      creditApi.getPackages(),
      creditApi.getTransactions(boutiqueId),
      creditApi.getBalance(boutiqueId)
    ]).then(([pkgs, txns, bal]) => {
      setPackages(pkgs.data.packages || []);
      setTransactions(txns.data.transactions || []);
      setBalance(bal.data.credits || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [boutiqueId]);

  const handleBuyCredits = async (pkg: any) => {
    if (!boutiqueId) return;
    setPaying(pkg.id);
    try {
      const res = await paymentApi.buyCredits({ package_id: pkg.id, boutique_id: boutiqueId });
      const { razorpay_order_id, amount, currency, key_id } = res.data;

      const rzp = new (window as any).Razorpay({
        key: key_id,
        amount,
        currency,
        order_id: razorpay_order_id,
        name: 'AI Boutique Studio',
        description: `${pkg.name} - ${pkg.credits + (pkg.bonus_credits || 0)} AI Credits`,
        image: '/logo.png',
        handler: async (response: any) => {
          try {
            await paymentApi.verifyCredits({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              boutique_id: boutiqueId,
              package_id: pkg.id
            });
            toast.success(`${pkg.credits + (pkg.bonus_credits || 0)} credits added!`);
            // Refresh
            const [bal, txns] = await Promise.all([creditApi.getBalance(boutiqueId), creditApi.getTransactions(boutiqueId)]);
            setBalance(bal.data.credits);
            setTransactions(txns.data.transactions || []);
          } catch {
            toast.error('Payment verification failed');
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#7c3aed' }
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    }
    setPaying('');
  };

  const pkgIcons = [Zap, Sparkles, Star];
  const pkgColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-amber-500 to-orange-500'
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">AI Credits</h1>
            <p className="text-sm text-muted-foreground">Power your AI features with credits</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">Current Balance</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-5xl font-bold">{balance}</p>
                <p className="text-purple-200 mb-1">credits</p>
              </div>
              <p className="text-purple-200 text-xs mt-2">AI Try-On: 2 credits • Chatbot: 1 credit per message</p>
            </div>
            <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10" />
            </div>
          </div>

          {balance < 10 && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
              <span className="text-sm">⚠️ Low credits! Buy more to keep AI features active.</span>
            </div>
          )}
        </div>

        {/* Credit usage info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { action: 'AI Try-On', cost: '2 credits', icon: '🎭' },
            { action: 'Chatbot Message', cost: '1 credit', icon: '💬' },
            { action: 'AI Stylist', cost: '2 credits', icon: '✨' },
            { action: 'Unused Credits', cost: 'Never expire', icon: '♾️' },
          ].map(item => (
            <div key={item.action} className="rounded-xl border bg-card p-3 text-center">
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="text-xs font-medium">{item.action}</p>
              <p className="text-xs text-primary font-semibold mt-0.5">{item.cost}</p>
            </div>
          ))}
        </div>

        {/* Packages */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Buy Credits</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)
            ) : packages.map((pkg, i) => {
              const Icon = pkgIcons[i] || Sparkles;
              const gradient = pkgColors[i] || pkgColors[0];
              const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
              return (
                <div key={pkg.id} className={`relative rounded-2xl border-2 overflow-hidden ${pkg.is_popular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'}`}>
                  {pkg.is_popular && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-1 font-medium">
                      Most Popular
                    </div>
                  )}
                  <div className={`bg-gradient-to-br ${gradient} p-6 text-white ${pkg.is_popular ? 'pt-8' : ''}`}>
                    <Icon className="h-8 w-8 mb-3 opacity-90" />
                    <p className="font-bold text-lg">{pkg.name}</p>
                    <p className="text-4xl font-bold mt-1">{pkg.credits}<span className="text-lg font-normal ml-1">credits</span></p>
                    {pkg.bonus_credits > 0 && (
                      <p className="text-sm opacity-80 mt-1">+{pkg.bonus_credits} bonus = {totalCredits} total</p>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold">₹{parseFloat(pkg.price).toLocaleString('en-IN')}</span>
                      <span className="text-muted-foreground text-sm">/ one-time</span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {totalCredits} AI credits total
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {Math.floor(totalCredits / 2)} virtual try-ons
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {totalCredits} chatbot messages
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        Credits never expire
                      </li>
                    </ul>
                    <button
                      onClick={() => handleBuyCredits(pkg)}
                      disabled={paying === pkg.id}
                      className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                        pkg.is_popular
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                      } disabled:opacity-50`}
                    >
                      {paying === pkg.id ? 'Processing...' : `Buy for ₹${parseFloat(pkg.price).toLocaleString('en-IN')}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Credit History</h2>
          <div className="rounded-xl border bg-card overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {['Type', 'Credits', 'Description', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          t.type === 'purchase' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          t.type === 'usage' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold flex items-center gap-1 ${t.credits > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {t.credits > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {t.credits > 0 ? '+' : ''}{t.credits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
