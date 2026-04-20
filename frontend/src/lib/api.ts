import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('abs-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('abs-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed API helpers
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  googleLogin: (credential: string, role?: string) => api.post('/auth/google', { credential, role }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

export const boutiqueApi = {
  getAll: (params?: any) => api.get('/boutiques', { params }),
  getBySlug: (slug: string) => api.get(`/boutiques/${slug}`),
  create: (data: any) => api.post('/boutiques', data),
  update: (id: string, data: any) => api.put(`/boutiques/${id}`, data),
  uploadLogo: (id: string, file: FormData) => api.post(`/boutiques/${id}/upload-logo`, file, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadBanner: (id: string, file: FormData) => api.post(`/boutiques/${id}/upload-banner`, file, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDashboard: (id: string) => api.get(`/boutiques/${id}/dashboard`),
};

export const productApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  uploadImages: (files: FormData) => api.post('/products/upload-image', files, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const orderApi = {
  place: (data: any) => api.post('/orders', data),
  getAll: (params?: any) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
};

export const aiApi = {
  chat: (data: any) => api.post('/ai/chat', data),
  tryon: (data: any) => api.post('/ai/tryon', data),
  tryonHistory: () => api.get('/ai/tryon/history'),
  stylist: (data: any) => api.post('/ai/stylist', data),
};

export const paymentApi = {
  createOrder: (data: any) => api.post('/payments/create-order', data),
  verifyOrder: (data: any) => api.post('/payments/verify', data),
  buyCredits: (data: any) => api.post('/payments/buy-credits', data),
  verifyCredits: (data: any) => api.post('/payments/verify-credits', data),
  subscribe: (data: any) => api.post('/payments/subscribe', data),
  verifySubscription: (data: any) => api.post('/payments/verify-subscription', data),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getBoutiques: (params?: any) => api.get('/admin/boutiques', { params }),
  updateBoutiqueStatus: (id: string, data: any) => api.patch(`/admin/boutiques/${id}/status`, data),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUserStatus: (id: string, data: any) => api.patch(`/admin/users/${id}/status`, data),
  getPlans: () => api.get('/admin/plans'),
  createPlan: (data: any) => api.post('/admin/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/admin/plans/${id}`, data),
  getCreditPackages: () => api.get('/admin/credit-packages'),
  createCreditPackage: (data: any) => api.post('/admin/credit-packages', data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings: any[]) => api.put('/admin/settings', { settings }),
  getOrders: (params?: any) => api.get('/admin/orders', { params }),
  addCredits: (id: string, data: any) => api.post(`/admin/boutiques/${id}/add-credits`, data),
};

export const measurementApi = {
  getAll: () => api.get('/measurements'),
  create: (data: any) => api.post('/measurements', data),
  update: (id: string, data: any) => api.put(`/measurements/${id}`, data),
  bookAppointment: (data: any) => api.post('/measurements/appointments', data),
  getBoutiqueAppointments: (boutiqueId: string) => api.get(`/measurements/appointments/boutique/${boutiqueId}`),
};

export const marketingApi = {
  getCoupons: (boutiqueId: string) => api.get(`/marketing/coupons/${boutiqueId}`),
  createCoupon: (data: any) => api.post('/marketing/coupons', data),
  toggleCoupon: (id: string, is_active: boolean) => api.patch(`/marketing/coupons/${id}`, { is_active }),
  validateCoupon: (data: any) => api.post('/marketing/coupons/validate', data),
  getCampaigns: (boutiqueId: string) => api.get(`/marketing/campaigns/${boutiqueId}`),
  createCampaign: (data: any) => api.post('/marketing/campaigns', data),
  sendCampaign: (id: string) => api.post(`/marketing/campaigns/${id}/send`),
  getWhatsAppLink: (data: any) => api.post('/marketing/whatsapp-share', data),
};

export const creditApi = {
  getPackages: () => api.get('/credits/packages'),
  getTransactions: (boutiqueId: string) => api.get(`/credits/transactions/${boutiqueId}`),
  getBalance: (boutiqueId: string) => api.get(`/credits/balance/${boutiqueId}`),
};
