import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithBiometrics,
    signup,
    logout,
    checkSession,
    clearError,
    setLoading,
  } = useAuthStore();

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    loginWithBiometrics,
    signup,
    logout,
    checkSession,
    clearError,
    setLoading,
    
    // Computed
    isPremium: user?.isPremium ?? false,
    isEmailVerified: user?.isEmailVerified ?? false,
    username: user?.username,
    email: user?.email,
    picture: user?.picture,
  };
};