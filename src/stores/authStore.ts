import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ISessionUserGetResponse, ILoginPayload, ISignupPayload } from '../types';
import { api, ApiError } from '../api';
import { apiClient } from '../api/client';
import { secureStorage, STORAGE_KEYS } from '../utils/storage';
import { debug } from '../utils/debug';

interface AuthState {
  // State
  user: ISessionUserGetResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (payload: ILoginPayload) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  signup: (payload: ISignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (payload: ILoginPayload) => {
        try {
          set({ isLoading: true, error: null });
          
          const loginResponse = await api.auth.login(payload);

          // Store refresh token if provided for biometric login setup
          if (loginResponse?.data?.refreshToken) {
            await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, loginResponse.data.refreshToken);
          }

          // Check if login response includes user data
          let user;
          if (loginResponse?.data?.user) {
            user = loginResponse.data.user;
          } else {
            // Fallback to session call if user data not in login response
            user = await api.auth.getSession();
          }
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = error as ApiError;
          set({
            error: apiError.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      loginWithBiometrics: async () => {
        try {
          debug.log('Starting biometric login...');
          set({ isLoading: true, error: null });

          // Check if we have a valid stored refresh token for biometric auth
          const refreshToken = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN);
          if (!refreshToken) {
            debug.log('No biometric refresh token found');
            throw new Error('Biometric authentication not set up. Please log in normally first.');
          }

          debug.log('Found biometric refresh token, attempting token refresh...');

          // Use refresh token to get new access token
          try {
            const refreshResponse = await api.auth.refreshTokenForBiometric(refreshToken);

            if (refreshResponse?.data?.token) {
              await apiClient.setAuthToken(refreshResponse.data.token);
              debug.log('Token refreshed successfully');
            }

            // Get user session with new token
            debug.log('Fetching user session...');
            const user = await api.auth.getSession();

            debug.log('Biometric login successful, setting auth state');
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (refreshError) {
            debug.log('Refresh token invalid or expired, clearing biometric setup');
            // Clear invalid biometric tokens
            await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN);
            throw new Error('Biometric authentication expired. Please log in normally to re-enable biometric login.');
          }
        } catch (error) {
          console.error('Biometric login error:', error);
          const apiError = error as ApiError;
          set({
            error: apiError.message || 'Biometric login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      signup: async (payload: ISignupPayload) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.auth.signup(payload);
          
          // After successful signup, login the user
          await get().login({
            login: payload.email,
            password: payload.password,
          });
        } catch (error) {
          const apiError = error as ApiError;
          set({
            error: apiError.message || 'Signup failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          await api.auth.logout();
          
          // Keep stored credentials for biometric login (only clear on explicit user action)
          debug.log('Logout: Keeping stored credentials for biometric login');
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Even if logout fails, keep stored credentials for biometric login
          debug.log('Logout (error case): Keeping stored credentials for biometric login');
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkSession: async () => {
        const { user, isAuthenticated } = get();
        
        // If we already have a user and are authenticated from persisted state, 
        // skip the API call for faster startup
        if (user && isAuthenticated) {
          set({ isLoading: false });
          return;
        }
        
        try {
          set({ isLoading: true, error: null });
          
          const sessionUser = await api.auth.getSession();
          
          set({
            user: sessionUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Session invalid or expired
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user data and authentication status
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);