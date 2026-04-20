'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Plus, Search, Package, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Wand2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function OwnerProducts() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    name: '', description: '', type: 'stitched', price: '', sale_price: '',
    fabric: '', colors: '', sizes: '', category: '', stock: '', sku: '',
    thumbnail_url: '', images: '', ai_tryon_enabled: true, customization_options: ''
  };
  const [form, setForm] = useState(defaultForm);

  const fetch = async () => {
    if (!user?.boutique_id) return;
    setLoading(true);
    try {
      const res = await productApi.getAll({ boutique_id: user.boutique_id });
      setProducts(res.data.products || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name, description: p.description || '', type: p.type,
      price: p.price, sale_price: p.sale_price || '',
      fabric: p.fabric || '', colors: Array.isArray(p.colors) ? p.colors.join(', ') : '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : '',
      category: p.category || '', stock: p.stock || '', sku: p.sku || '',
      thumbnail_url: p.thumbnail_url || '',
      images: Array.isArray(p.images) ? p.images.join(', ') : '',
      ai_tryon_enabled: p.ai_tryon_enabled,
      customization_options: p.customization_options ? JSON.stringify(p.customization_options) : ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.type) return toast.error('Name, price and type are required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        boutique_id: user?.boutique_id,
        price: parseFloat(form.price as string),
        sale_price: form.sale_price ? parseFloat(form.sale_price as string) : null,
        stock: parseInt(form.stock as string) || 0,
        colors: form.colors ? form.colors.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        sizes: form.sizes ? form.sizes.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        images: form.images ? form.images.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };
      if (editProduct) {
        await productApi.update(editProduct.id, payload);
        toast.success('Product updated!');
      } else {
        await productApi.create(payload);
        toast.success('Product created!');
      }
      setShowForm(false);
      setEditProduct(null);
      setForm(defaultForm);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      fetch();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">{products.length} products total</p>
          </div>
          <button
            onClick={() => { setEditProduct(null); setForm(defaultForm); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {['all', 'stitched', 'custom', 'unstitched'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
            >{t}</button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl border bg-card">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first product to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="rounded-xl border bg-card overflow-hidden group hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {p.sale_price && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Sale
                    </span>
                  )}
                  {p.ai_tryon_enabled && (
                    <span className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Wand2 className="h-2.5 w-2.5" /> Try-On
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{p.type}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-semibold text-sm">₹{parseFloat(p.price).toLocaleString('en-IN')}</span>
                    {p.sale_price && (
                      <span className="text-xs text-muted-foreground line-through">₹{parseFloat(p.sale_price).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
                    <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-2xl my-8">
            <h3 className="text-lg font-semibold mb-5">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Product Name *', type: 'text', placeholder: 'Anarkali Suit', full: true },
                { key: 'type', label: 'Type *', type: 'select', options: ['stitched', 'custom', 'unstitched'] },
                { key: 'price', label: 'Price (₹) *', type: 'number', placeholder: '1499' },
                { key: 'sale_price', label: 'Sale Price (₹)', type: 'number', placeholder: 'Optional' },
                { key: 'fabric', label: 'Fabric', type: 'text', placeholder: 'Silk, Cotton...' },
                { key: 'category', label: 'Category', type: 'text', placeholder: 'Salwar Kameez' },
                { key: 'stock', label: 'Stock', type: 'number', placeholder: '10' },
                { key: 'sku', label: 'SKU', type: 'text', placeholder: 'ANA-001' },
                { key: 'colors', label: 'Colors (comma separated)', type: 'text', placeholder: 'Red, Blue, Green', full: true },
                { key: 'sizes', label: 'Sizes (comma separated)', type: 'text', placeholder: 'S, M, L, XL, XXL', full: true },
                { key: 'thumbnail_url', label: 'Thumbnail URL', type: 'text', placeholder: 'https://...', full: true },
                { key: 'images', label: 'Image URLs (comma separated)', type: 'text', placeholder: 'https://img1.jpg, https://img2.jpg', full: true },
              ].map(f => (
                <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {f.options?.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product..."
                  rows={3}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setForm(prev => ({ ...prev, ai_tryon_enabled: !prev.ai_tryon_enabled }))}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${form.ai_tryon_enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <div className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${form.ai_tryon_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                      style={{ height: 18, width: 18, transform: form.ai_tryon_enabled ? 'translateX(20px)' : 'translateX(2px)' }} />
                  </div>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Wand2 className="h-4 w-4 text-primary" /> Enable AI Virtual Try-On for this product
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button onClick={() => { setShowForm(false); setEditProduct(null); }} className="flex-1 rounded-lg border px-4 py-2.5 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : (editProduct ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
