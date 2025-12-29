import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens';
import { useAuth } from '../hooks';
import { useProfileOverlay } from '../contexts/ProfileOverlayContext';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const { setOnViewJournal } = useProfileOverlay();
  const [showSplash, setShowSplash] = useState(true);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);


  useEffect(() => {
    // Check for existing session on app start
    const initializeAuth = async () => {
      try {
        await checkSession();
      } catch (error) {
        // Session check failed, proceed to auth flow
      } finally {
        setSessionCheckComplete(true);
      }
    };
    
    initializeAuth();
  }, []);

  // Create stable callback function
  const navigateToUserJournal = useCallback((username: string) => {
    if (!username) {
      return;
    }
    
    try {
      navigationRef.current?.navigate('Main', {
        screen: 'UserJournal',
        params: { username }
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, []);

  // Set up global navigation callback for ProfileOverlay
  useEffect(() => {
    if (isAuthenticated && sessionCheckComplete && !showSplash) {
      setOnViewJournal(navigateToUserJournal);
    }
  }, [isAuthenticated, sessionCheckComplete, showSplash, navigateToUserJournal]);

  const onNavigationReady = () => {
    // Navigation container is ready
  };

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#ffffff' },
        }}
      >
        {showSplash ? (
          <Stack.Screen
            name="Splash"
            children={() => (
              <SplashScreen 
                onFinish={() => setShowSplash(false)} 
                isLoading={!sessionCheckComplete}
              />
            )}
          />
        ) : isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

