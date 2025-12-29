import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';

interface SpinningBadgeLoaderProps {
  size?: number;
  speed?: number;
  spinning?: boolean;
}

export const SpinningBadgeLoader: React.FC<SpinningBadgeLoaderProps> = ({ 
  size = 40, 
  speed = 1000,
  spinning = true 
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (spinning) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        })
      );
      
      spinAnimation.start();
      
      return () => spinAnimation.stop();
    } else {
      // Stop spinning by resetting to 0
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [spinning, spinValue, speed]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Image
          source={require('../../assets/images/heimursaga_badge.png')}
          style={[styles.badge, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    opacity: 0.9,
  },
});