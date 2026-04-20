'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { measurementApi } from '@/lib/api';
import { Ruler, Plus, Edit, Calendar, Check, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const FIELDS = [
  { key: 'chest', label: 'Chest', unit: 'inches' },
  { key: 'waist', label: 'Waist', unit: 'inches' },
  { key: 'hips', label: 'Hips', unit: 'inches' },
  { key: 'shoulder', label: 'Shoulder', unit: 'inches' },
  { key: 'sleeve_length', label: 'Sleeve Length', unit: 'inches' },
  { key: 'dress_length', label: 'Dress Length', unit: 'inches' },
  { key: 'neck', label: 'Neck', unit: 'inches' },
  { key: 'inseam', label: 'Inseam', unit: 'inches' },
];

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = { name: 'My Measurements', chest: '', waist: '', hips: '', shoulder: '', sleeve_length: '', dress_length: '', neck: '', inseam: '', notes: '' };
  const [form, setForm] = useState(defaultForm);
  const [apptForm, setApptForm] = useState({ scheduled_at: '', address: '', phone: '', notes: '' });

  const fetch = async () => {
    try {
      const res = await measurementApi.getAll();
      setMeasurements(res.data.measurements || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openEdit = (m: any) => {
    setEditMeasurement(m);
    setForm({ name: m.name, chest: m.chest || '', waist: m.waist || '', hips: m.hips || '', shoulder: m.shoulder || '', sleeve_length: m.sleeve_length || '', dress_length: m.dress_length || '', neck: m.neck || '', inseam: m.inseam || '', notes: m.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : isNaN(Number(v)) ? v : parseFloat(v as string)]));
      if (editMeasurement) {
        await measurementApi.update(editMeasurement.id, payload);
        toast.success('Measurements updated!');
      } else {
        await measurementApi.create(payload);
        toast.success('Measurements saved!');
      }
      setShowForm(false); setEditMeasurement(null); setForm(defaultForm); fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const bookAppointment = async () => {
    if (!apptForm.scheduled_at || !apptForm.address || !apptForm.phone) return toast.error('Please fill all required fields');
    try {
      await measurementApi.bookAppointment({ ...apptForm, boutique_id: undefined });
      toast.success('Appointment booked!');
      setShowAppointment(false);
      setApptForm({ scheduled_at: '', address: '', phone: '', notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to book appointment');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Measurements</h1>
            <p className="text-sm text-muted-foreground">Save your measurements for perfect custom orders</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAppointment(true)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              <Calendar className="h-4 w-4" /> Book Appointment
            </button>
            <button onClick={() => { setEditMeasurement(null); setForm(defaultForm); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Add Measurements
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <Ruler className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">Measurement Tips</p>
            <p className="text-blue-600 dark:text-blue-500 mt-0.5">Measure in inches while standing upright. Wear fitted clothing. Ask someone to help for accurate results.</p>
          </div>
        </div>

        {/* Measurements list */}
        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
        ) : measurements.length === 0 ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed">
            <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No measurements saved</p>
            <p className="text-sm text-muted-foreground mt-1">Add your measurements or book a home appointment</p>
          </div>
        ) : measurements.map(m => (
          <div key={m.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{m.name}</h3>
                {m.is_default && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    <Check className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
              <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <Edit className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FIELDS.map(f => m[f.key] && (
                <div key={f.key} className="rounded-lg bg-muted/40 p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-base font-bold mt-0.5">{m[f.key]}"</p>
                </div>
              ))}
            </div>
            {m.notes && <p className="text-sm text-muted-foreground mt-3 border-t pt-3">📝 {m.notes}</p>}
            <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date(m.updated_at).toLocaleDateString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Measurements Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-lg my-8">
            <h3 className="font-semibold mb-5">{editMeasurement ? 'Edit' : 'Add'} Measurements</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Profile Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium">{f.label} <span className="text-muted-foreground font-normal text-xs">({f.unit})</span></label>
                    <input
                      type="number"
                      step="0.5"
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="e.g. 36"
                      className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  placeholder="Any special notes..." className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowForm(false); setEditMeasurement(null); }} className="flex-1 rounded-lg border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Measurements'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-1">Book Measurement Appointment</h3>
            <p className="text-sm text-muted-foreground mb-4">A tailor will visit your home to take measurements</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Preferred Date & Time *</label>
                <input type="datetime-local" value={apptForm.scheduled_at} onChange={e => setApptForm(p => ({ ...p, scheduled_at: e.target.value }))}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium">Your Address *</label>
                <textarea value={apptForm.address} onChange={e => setApptForm(p => ({ ...p, address: e.target.value }))} rows={2}
                  placeholder="Full address with landmark..." className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <input type="tel" value={apptForm.phone} onChange={e => setApptForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210" className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <input value={apptForm.notes} onChange={e => setApptForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any special instructions..." className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAppointment(false)} className="flex-1 rounded-lg border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
                <button onClick={bookAppointment} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90">
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
