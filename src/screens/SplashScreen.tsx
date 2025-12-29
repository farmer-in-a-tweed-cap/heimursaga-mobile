import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, Text, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';
import { SpinningBadgeLoader } from '../components/ui';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isLoading = false }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start visible to match launch screen
  const scaleAnim = useRef(new Animated.Value(1)).current; // Start at full scale to match launch screen
  const taglineFadeAnim = useRef(new Animated.Value(0)).current;
  const madeinMaineFadeAnim = useRef(new Animated.Value(0)).current;

  // Debug logging
  useEffect(() => {
  }, [isLoading]);

  useEffect(() => {
    // Start with static logo (matching launch screen), then animate in additional elements
    const initialSequence = Animated.sequence([
      // Wait a moment to let launch screen disappear seamlessly
      Animated.delay(500),
      // Tagline fade in
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Made in Maine fade in
      Animated.timing(madeinMaineFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    initialSequence.start();
  }, []);

  // Handle loading state changes
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let fallbackTimeoutId: ReturnType<typeof setTimeout>;

    if (!isLoading) {
      // Wait a bit to show the splash, then fade out
      timeoutId = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(taglineFadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(madeinMaineFadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onFinish();
        });
      }, 2000); // Show splash for at least 2 seconds
    }

    // Fallback: always finish after maximum 10 seconds to prevent infinite loading
    fallbackTimeoutId = setTimeout(() => {
      onFinish();
    }, 10000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
    };
  }, [isLoading, onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image 
            source={require('../assets/images/logo_copper_black.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text 
          style={[styles.tagline, { opacity: taglineFadeAnim }]}
        >
          EXPLORE • SHARE • SPONSOR
        </Animated.Text>
      </View>

      {/* Made in Maine */}
      <Animated.Text 
        style={[styles.madeinMaine, { opacity: madeinMaineFadeAnim }]}
      >
        Made in Maine
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    marginTop: -60, // Shift the entire logo+tagline unit up to center them together
  },
  logoContainer: {
    marginLeft: -30, // Only offset the logo, not the tagline
  },
  logo: {
    width: 300,
    height: 113, // Maintaining 8:3 aspect ratio (300/2.66)
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  madeinMaine: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    position: 'absolute',
    bottom: 40,
    width: width,
    opacity: 0.7,
  },
});