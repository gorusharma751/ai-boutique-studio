import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'customer';
  avatar_url?: string;
  boutique_id?: string;
  boutique_name?: string;
  boutique_status?: string;
  ai_credits?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const token = get().token;
          if (!token) return;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isAuthenticated: true });
        } catch (err) {
          set({ user: null, token: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      }
    }),
    {
      name: 'abs-auth',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
);

export default useAuthStore;
