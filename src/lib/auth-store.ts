import { create } from 'zustand';
import { supabase } from './supabase';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userEmail: string | null;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  userEmail: null,
  
  checkAuthStatus: async () => {
    try {
      set({ isLoading: true });
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking auth status:', error);
        set({ isAuthenticated: false, userId: null, userEmail: null, isLoading: false });
        return;
      }
      
      if (data.session) {
        console.log('User is authenticated:', data.session.user.email);
        set({ 
          isAuthenticated: true,
          userId: data.session.user.id,
          userEmail: data.session.user.email,
          isLoading: false 
        });
      } else {
        console.log('User is not authenticated');
        set({ isAuthenticated: false, userId: null, userEmail: null, isLoading: false });
      }
    } catch (error) {
      console.error('Unexpected error checking auth status:', error);
      set({ isAuthenticated: false, userId: null, userEmail: null, isLoading: false });
    }
  },
  
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ isAuthenticated: false, userId: null, userEmail: null });
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}));

// Initialize auth state check on import
useAuthStore.getState().checkAuthStatus();

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in:', session.user.email);
    useAuthStore.setState({ 
      isAuthenticated: true,
      userId: session.user.id,
      userEmail: session.user.email,
      isLoading: false
    });
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    useAuthStore.setState({ 
      isAuthenticated: false, 
      userId: null, 
      userEmail: null,
      isLoading: false
    });
  }
  
  // Refresh state on token refresh
  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('Token refreshed for user:', session.user.email);
    useAuthStore.setState({
      isAuthenticated: true,
      userId: session.user.id,
      userEmail: session.user.email,
      isLoading: false
    });
  }
});