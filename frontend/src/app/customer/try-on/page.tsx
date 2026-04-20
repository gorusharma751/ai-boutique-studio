'use client';

import React, { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { aiApi, productApi } from '@/lib/api';
import { Wand2, Upload, Image, Loader2, Download, RefreshCw, Search, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

export default function TryOnPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<'select' | 'upload' | 'generating' | 'result'>('select');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customerPhoto, setCustomerPhoto] = useState<string>('');
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [boutiqueId, setBoutiqueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const searchProducts = async () => {
    if (!searchQuery && !boutiqueId) return;
    setLoading(true);
    try {
      const res = await productApi.getAll({
        search: searchQuery || undefined,
        boutique_id: boutiqueId || undefined
      });
      setProducts(res.data.products?.filter((p: any) => p.ai_tryon_enabled) || []);
    } catch { toast.error('Failed to fetch products'); }
    setLoading(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    setCustomerPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCustomerPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
    setStep('upload');
  };

  const handleGenerate = async () => {
    if (!selectedProduct || !customerPhoto) {
      toast.error('Please select a product and upload your photo');
      return;
    }
    if (!selectedProduct.boutique_id) {
      toast.error('Product boutique information missing');
      return;
    }

    setStep('generating');
    try {
      // Use the product thumbnail as the dress image
      const productImageUrl = selectedProduct.thumbnail_url || (Array.isArray(selectedProduct.images) ? selectedProduct.images[0] : '');
      if (!productImageUrl) {
        toast.error('Product has no image for try-on');
        setStep('upload');
        return;
      }

      const res = await aiApi.tryon({
        boutique_id: selectedProduct.boutique_id,
        product_id: selectedProduct.id,
        customer_photo_url: customerPhoto,
        product_image_url: productImageUrl
      });

      setGeneratedImage(res.data.generated_image_url);
      setStep('result');
      toast.success('Virtual try-on generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Try-on generation failed');
      setStep('upload');
    }
  };

  const reset = () => {
    setStep('select');
    setSelectedProduct(null);
    setCustomerPhoto('');
    setCustomerPhotoFile(null);
    setGeneratedImage('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Virtual Try-On</h1>
            <p className="text-sm text-muted-foreground">See how any outfit looks on you before ordering</p>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary">How it works</p>
            <p className="text-muted-foreground mt-0.5">Select a dress from any boutique, upload your photo, and our AI will show you wearing that outfit. Each try-on uses 2 AI credits.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {['Select Dress', 'Upload Photo', 'Generate', 'Result'].map((s, i) => {
            const stepKeys = ['select', 'upload', 'generating', 'result'];
            const currentIdx = stepKeys.indexOf(step);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="h-4 w-4 rounded-full flex items-center justify-center text-xs font-bold">
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:block">{s}</span>
                </div>
                {i < 3 && <div className="flex-1 h-px bg-border" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Select product */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchProducts()}
                  placeholder="Search dresses, sarees, suits..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={searchProducts} disabled={loading} className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 rounded-xl border-2 border-dashed">
                <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Search for a dress to try on</p>
                <p className="text-sm text-muted-foreground mt-1">Only products with AI try-on enabled will appear</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProduct(p); setStep('upload'); }}
                    className={`rounded-xl border-2 overflow-hidden text-left transition-all hover:shadow-md ${
                      selectedProduct?.id === p.id ? 'border-primary' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="aspect-square bg-muted">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.boutique_name}</p>
                      <p className="text-xs font-semibold text-primary mt-1">₹{parseFloat(p.price).toLocaleString('en-IN')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Upload photo */}
        {step === 'upload' && (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Selected product */}
            <div className="space-y-3">
              <h3 className="font-medium">Selected Outfit</h3>
              {selectedProduct && (
                <div className="rounded-xl border overflow-hidden">
                  <div className="aspect-[3/4] bg-muted">
                    {selectedProduct.thumbnail_url ? (
                      <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProduct.boutique_name}</p>
                    <p className="text-sm font-semibold text-primary mt-1">₹{parseFloat(selectedProduct.price).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}
              <button onClick={() => setStep('select')} className="text-xs text-primary hover:underline">
                ← Change outfit
              </button>
            </div>

            {/* Photo upload */}
            <div className="space-y-3">
              <h3 className="font-medium">Your Photo</h3>
              {customerPhoto ? (
                <div className="rounded-xl border overflow-hidden">
                  <div className="aspect-[3/4] bg-muted">
                    <img src={customerPhoto} alt="Your photo" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <button
                      onClick={() => { setCustomerPhoto(''); setCustomerPhotoFile(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload your photo</p>
                    <p className="text-xs text-muted-foreground mt-1">Full body photo works best • Max 5MB</p>
                  </div>
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {!customerPhoto && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    For best results, use a full-body photo with good lighting and a plain background.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate button */}
        {step === 'upload' && (
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!selectedProduct || !customerPhoto}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
            >
              <Wand2 className="h-5 w-5" />
              Generate Virtual Try-On
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">2 credits</span>
            </button>
          </div>
        )}

        {/* Generating */}
        {step === 'generating' && (
          <div className="text-center py-20">
            <div className="relative inline-flex">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto">
                <Wand2 className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mt-6">Generating your try-on...</h3>
            <p className="text-muted-foreground mt-2">Our AI is working its magic! This may take 20-60 seconds.</p>
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && generatedImage && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border overflow-hidden">
                <p className="text-xs font-medium px-3 py-2 border-b bg-muted/30">Your Photo</p>
                <img src={customerPhoto} alt="Original" className="w-full aspect-[3/4] object-cover" />
              </div>
              <div className="rounded-xl border overflow-hidden">
                <p className="text-xs font-medium px-3 py-2 border-b bg-muted/30">Selected Outfit</p>
                <img src={selectedProduct?.thumbnail_url} alt="Outfit" className="w-full aspect-[3/4] object-cover" />
              </div>
              <div className="rounded-xl border-2 border-primary overflow-hidden">
                <p className="text-xs font-medium px-3 py-2 border-b bg-primary/5 text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Try-On Result
                </p>
                <img src={generatedImage} alt="Try-On Result" className="w-full aspect-[3/4] object-cover" />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={generatedImage}
                download="ai-tryon-result.jpg"
                className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" /> Download Image
              </a>
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
                <RefreshCw className="h-4 w-4" /> Try Another Outfit
              </button>
            </div>

            {selectedProduct && (
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProduct.boutique_name}</p>
                  <p className="text-lg font-bold text-primary mt-1">₹{parseFloat(selectedProduct.price).toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => window.location.href = `/boutique/${selectedProduct.boutique_slug}`}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Order Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
