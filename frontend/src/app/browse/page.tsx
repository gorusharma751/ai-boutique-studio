'use client';

import React, { useEffect, useState } from 'react';
import { boutiqueApi } from '@/lib/api';
import Navbar from '@/components/shared/Navbar';
import { Search, MapPin, Star, Wand2, MessageSquare, ArrowRight, Store, Filter } from 'lucide-react';
import Link from 'next/link';

export default function BrowsePage() {
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [featured, setFeatured] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await boutiqueApi.getAll({
        page, limit: 12,
        search: search || undefined,
        city: city || undefined,
        featured: featured ? 'true' : undefined
      });
      setBoutiques(res.data.boutiques || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page, featured]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetch();
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 py-12 px-4">
        <div className="container mx-auto text-center space-y-4 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold">Explore Boutiques</h1>
          <p className="text-muted-foreground">Discover curated boutiques with AI-powered shopping experiences</p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search boutiques..."
                className="w-full pl-9 pr-4 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
                className="w-full pl-9 pr-4 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              />
            </div>
            <button type="submit" className="rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4 border-b">
        <p className="text-sm text-muted-foreground shrink-0">{total} boutiques</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFeatured(false); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!featured ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
          >All Boutiques</button>
          <button
            onClick={() => { setFeatured(true); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${featured ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
          >⭐ Featured</button>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
          </div>
        ) : boutiques.length === 0 ? (
          <div className="text-center py-20">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No boutiques found</h3>
            <p className="text-muted-foreground mt-1">Try a different search term or location</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {boutiques.map(b => (
              <Link
                key={b.id}
                href={`/boutique/${b.slug}`}
                className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Banner */}
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 relative overflow-hidden">
                  {b.banner_url ? (
                    <img src={b.banner_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="h-12 w-12 text-purple-300 dark:text-purple-700" />
                    </div>
                  )}
                  {b.is_featured && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl border-2 border-background bg-card overflow-hidden -mt-7 shadow-md shrink-0">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{b.name?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-semibold text-sm truncate">{b.name}</h3>
                      {b.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {b.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {b.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{b.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                    {b.rating > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{parseFloat(b.rating).toFixed(1)}</span>
                        <span className="text-muted-foreground">({b.total_reviews})</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{b.product_count} products</div>
                    <div className="ml-auto flex items-center gap-1.5">
                      {b.ai_tryon_enabled && (
                        <div className="flex items-center gap-0.5 text-xs text-primary" title="AI Try-On">
                          <Wand2 className="h-3 w-3" />
                        </div>
                      )}
                      {b.ai_chatbot_enabled && (
                        <div className="flex items-center gap-0.5 text-xs text-blue-500" title="AI Chatbot">
                          <MessageSquare className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-primary font-medium mt-3 group-hover:gap-2 gap-1 transition-all">
                    Shop Now <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-accent transition-colors">
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-accent transition-colors">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
