'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, MessageSquare, ShoppingBag, Star, ArrowRight, Store, Ruler } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import useAuthStore from '@/store/authStore';

export default function HomePage() {
  const { isAuthenticated, user, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  const features = [
    { icon: Wand2, title: 'AI Virtual Try-On', desc: 'Upload your photo and see yourself in any outfit instantly', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { icon: MessageSquare, title: 'AI Fashion Chatbot', desc: 'Get personalized style advice and outfit recommendations', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
    { icon: Ruler, title: 'Smart Measurements', desc: 'Save measurements or book a home appointment', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { icon: Store, title: 'Multi-Boutique Marketplace', desc: 'Discover hundreds of curated boutiques in one place', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  ];

  const stats = [
    { value: '500+', label: 'Boutiques' },
    { value: '10K+', label: 'Happy Customers' },
    { value: '50K+', label: 'Outfits Available' },
    { value: '4.9★', label: 'Average Rating' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-background to-pink-50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              India's #1 AI-Powered Boutique Marketplace
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Your Fashion,{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Reimagined
              </span>{' '}
              with AI
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover boutiques, try on outfits virtually, get AI-powered style advice, and order custom clothing — all in one beautiful platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Explore Boutiques <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/register?role=owner"
                  className="inline-flex items-center gap-2 rounded-xl border bg-background px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors"
                >
                  <Store className="h-4 w-4" /> List Your Boutique
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Cutting-edge AI features that transform how you shop for clothes</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} mb-4`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Own a Boutique?</h2>
          <p className="text-purple-100 mb-8 max-w-lg mx-auto">
            Join hundreds of boutique owners already growing their business with our AI-powered platform
          </p>
          <Link
            href="/register?role=owner"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-purple-600 px-8 py-3 font-semibold hover:bg-purple-50 transition-colors"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-purple-200 text-sm mt-3">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">AI Boutique Studio</span>
          </p>
          <p>© {new Date().getFullYear()} AI Boutique Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
