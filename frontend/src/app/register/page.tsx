'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Sparkles, Store, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';

function RegisterContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'owner') setRole('owner');
  }, [searchParams]);

  const handleGoogleRegister = async (response: any) => {
    try {
      setLoading(true);
      const res = await authApi.googleLogin(response.credential, role);
      setAuth(res.data.user, res.data.token);
      toast.success('Account created!');
      router.replace(role === 'owner' ? '/owner' : '/customer');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Google sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const initGoogle = () => {
    if (!(window as any).google) return;
    (window as any).google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleRegister
    });
    (window as any).google.accounts.id.renderButton(
      document.getElementById('google-reg-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
    );
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => initGoogle();
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      setLoading(true);
      const res = await authApi.register({ name, email, password, phone, role });
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome to AI Boutique Studio!');
      router.replace(role === 'owner' ? '/owner' : '/customer');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI Boutique Studio
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1">Start your AI fashion journey</p>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm p-8 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'customer', label: 'Customer', icon: User, desc: 'Shop & Try-On' },
              { value: 'owner', label: 'Boutique Owner', icon: Store, desc: 'Sell & Manage' }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value as any)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all ${
                  role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <r.icon className={`h-5 w-5 ${role === r.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-sm font-medium ${role === r.value ? 'text-primary' : ''}`}>{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </button>
            ))}
          </div>

          <div id="google-reg-btn" className="w-full min-h-[44px] flex justify-center" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
