'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || null;

  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = redirect || (user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/customer');
      router.replace(dest);
    }
  }, [isAuthenticated, user]);

  // Load Google SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => initGoogle();
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const initGoogle = () => {
    if (!(window as any).google) return;
    (window as any).google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin
    });
    (window as any).google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
    );
  };

  const handleGoogleLogin = async (response: any) => {
    try {
      setLoading(true);
      const res = await authApi.googleLogin(response.credential);
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    try {
      setLoading(true);
      const res = await authApi.login({ email, password });
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      const dest = redirect || (res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'owner' ? '/owner' : '/customer');
      router.replace(dest);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI Boutique Studio
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-sm p-8 space-y-5">
          {/* Google button */}
          <div id="google-btn" className="w-full min-h-[44px] flex justify-center" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
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
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
