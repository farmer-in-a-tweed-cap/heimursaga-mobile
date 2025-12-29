import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AppNavigator } from './src/navigation';
import { ProfileOverlayProvider } from './src/contexts/ProfileOverlayContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { setupGlobalErrorHandling, errorHandler } from './src/utils/errorHandler';

// Enable screens for react-navigation
enableScreens();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Set up global error handling
    setupGlobalErrorHandling();
  }, []);

  const handleAppError = (error: Error) => {
    errorHandler.logError(error, {
      component: 'App',
      action: 'render',
    });
  };

  return (
    <ErrorBoundary onError={handleAppError}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary onError={handleAppError}>
              <ProfileOverlayProvider>
                <StatusBar
                  barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                  backgroundColor="#ffffff"
                />
                <ErrorBoundary onError={handleAppError}>
                  <AppNavigator />
                </ErrorBoundary>
              </ProfileOverlayProvider>
            </ErrorBoundary>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
