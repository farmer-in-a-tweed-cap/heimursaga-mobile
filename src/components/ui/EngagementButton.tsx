import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { BookmarkSimple, Heart, Share, Check } from 'phosphor-react-native';
import { Colors } from '../../theme/colors';

export interface EngagementButtonProps {
  type: 'like' | 'bookmark' | 'share';
  active?: boolean;
  count?: number;
  disabled?: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

export const EngagementButton: React.FC<EngagementButtonProps> = ({
  type,
  active = false,
  count = 0,
  disabled = false,
  onPress,
  size = 'medium',
  showCount = true,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      scaleValue.stopAnimation();
    };
  }, [scaleValue]);

  const getIcon = () => {
    const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
    const iconWeight = active ? 'fill' : 'regular';

    switch (type) {
      case 'like':
        return <Heart size={iconSize} weight={iconWeight} />;
      case 'bookmark':
        return <BookmarkSimple size={iconSize} weight={iconWeight} />;
      case 'share':
        return <Share size={iconSize} weight="regular" />;
      default:
        return null;
    }
  };

  const getButtonStyle = () => {
    const baseSize = size === 'small' ? 32 : size === 'medium' ? 36 : 40;

    return [
      styles.button,
      {
        width: baseSize,
        height: baseSize,
        backgroundColor: active
          ? (type === 'like' ? Colors.primary : Colors.primary)
          : Colors.background.secondary,
      },
      disabled && styles.disabled,
    ];
  };

  const getIconColor = () => {
    if (disabled) return Colors.disabled;
    if (active) {
      return Colors.background.primary;
    }
    return Colors.text.secondary;
  };

  const getAccessibilityLabel = () => {
    switch (type) {
      case 'like':
        return active ? 'Remove highlight' : 'Highlight entry';
      case 'bookmark':
        return active ? 'Remove bookmark' : 'Bookmark entry';
      case 'share':
        return 'Share entry';
      default:
        return '';
    }
  };

  const handlePress = () => {
    if (disabled) return;

    // Animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          style={getButtonStyle()}
          onPress={handlePress}
          disabled={disabled}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {getIcon() && React.cloneElement(getIcon()!, { color: getIconColor() })}
            {active && type !== 'share' && (
              <View style={styles.checkBadge}>
                <Check size={8} weight="bold" color={Colors.background.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {showCount && (type === 'like' || type === 'bookmark') && count > 0 && (
        <Text style={[styles.countText, { color: getIconColor() }]}>
          {count}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  button: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  disabled: {
    opacity: 0.5,
  },
});