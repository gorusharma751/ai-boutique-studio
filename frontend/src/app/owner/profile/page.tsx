'use client';
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { boutiqueApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Store, MapPin, Phone, Mail, Globe, Save, Wand2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BoutiqueProfilePage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: '', description: '', phone: '', email: '', whatsapp_number: '',
    address: '', city: '', state: '', pincode: '', google_business_url: '',
    google_maps_embed: '', instagram_url: '', facebook_url: '',
    ai_chatbot_enabled: true, ai_tryon_enabled: true, ai_stylist_enabled: true
  });

  useEffect(() => {
    if (user?.boutique_id) {
      boutiqueApi.getBySlug('').catch(() => {});
    }
  }, [user]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name && !user?.boutique_id) return toast.error('Boutique name is required');
    setSaving(true);
    try {
      if (user?.boutique_id) {
        await boutiqueApi.update(user.boutique_id, form);
        toast.success('Boutique updated successfully!');
      } else {
        await boutiqueApi.create(form);
        toast.success('Boutique created! Pending admin approval.');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save boutique');
    }
    setSaving(false);
  };

  const textFields = [
    { key: 'name', label: 'Boutique Name *', type: 'text', placeholder: 'Priya Fashion House' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'boutique@email.com' },
    { key: 'whatsapp_number', label: 'WhatsApp', type: 'tel', placeholder: '+91 98765 43210' },
    { key: 'address', label: 'Address', type: 'text', placeholder: 'Shop No, Street' },
    { key: 'city', label: 'City', type: 'text', placeholder: 'Mumbai' },
    { key: 'state', label: 'State', type: 'text', placeholder: 'Maharashtra' },
    { key: 'pincode', label: 'Pincode', type: 'text', placeholder: '400001' },
    { key: 'google_business_url', label: 'Google Business URL', type: 'url', placeholder: 'https://g.page/...' },
    { key: 'google_maps_embed', label: 'Google Maps Embed', type: 'url', placeholder: 'https://www.google.com/maps/embed?...' },
    { key: 'instagram_url', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/...' },
    { key: 'facebook_url', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/...' },
  ];

  const aiToggles = [
    { key: 'ai_chatbot_enabled', label: 'AI Chatbot', desc: 'Allow customers to chat with AI', icon: MessageSquare },
    { key: 'ai_tryon_enabled', label: 'AI Virtual Try-On', desc: 'Virtual outfit try-on for customers', icon: Wand2 },
    { key: 'ai_stylist_enabled', label: 'AI Stylist', desc: 'AI-powered outfit recommendations', icon: Wand2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">{user?.boutique_id ? 'My Boutique' : 'Create Boutique'}</h1>
            <p className="text-sm text-muted-foreground">{user?.boutique_id ? 'Update your boutique details' : 'Set up your boutique profile'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold border-b pb-3">Boutique Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Tell customers about your boutique, specialties, and story..." rows={3}
                className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            {textFields.map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium">{f.label}</label>
                <input type={f.type} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder} className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Maps preview */}
        {form.google_maps_embed && (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Location Preview
            </div>
            <iframe src={form.google_maps_embed} width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}

        {/* AI features (only for existing boutiques) */}
        {user?.boutique_id && (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold border-b pb-3">AI Features</h3>
            {aiToggles.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <t.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => set(t.key, !form[t.key])}
                  className={`relative shrink-0 rounded-full transition-colors ${form[t.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  style={{ width: 40, height: 22 }}
                >
                  <div className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform`}
                    style={{ transform: form[t.key] ? 'translateX(20px)' : 'translateX(2px)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : (user?.boutique_id ? 'Save Changes' : 'Create Boutique')}
        </button>
      </div>
    </DashboardLayout>
  );
}
