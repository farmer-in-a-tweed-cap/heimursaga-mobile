import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { useProfileOverlay } from '../../contexts/ProfileOverlayContext';

interface AvatarUser {
  username: string;
  picture?: string;
  creator?: boolean;
  role?: string;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'small' | 'medium' | 'large';
  showCreatorBorder?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
  onPress?: () => void; // Optional custom onPress that overrides default behavior
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  showCreatorBorder = true,
  disabled = false,
  style,
  imageStyle,
  textStyle,
  onPress,
}) => {
  const { showProfile } = useProfileOverlay();

  const isCreator = user.creator || user.role === 'creator';
  
  const sizeConfig = {
    small: { width: 32, height: 32, borderRadius: 16, fontSize: 12, borderWidth: 2 },
    medium: { width: 48, height: 48, borderRadius: 24, fontSize: 16, borderWidth: 2 },
    large: { width: 64, height: 64, borderRadius: 32, fontSize: 20, borderWidth: 3 },
  };

  const config = sizeConfig[size];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!disabled) {
      showProfile(user.username);
    }
  };

  const avatarStyle: ViewStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.borderRadius,
    ...(showCreatorBorder && isCreator && {
      borderWidth: config.borderWidth,
      borderColor: '#AC6D46',
    }),
    ...(style || {}),
  };

  const containerImageStyle: ImageStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.borderRadius,
    ...(showCreatorBorder && isCreator && {
      width: config.width - config.borderWidth * 2,
      height: config.height - config.borderWidth * 2,
      borderRadius: config.borderRadius - config.borderWidth,
    }),
    ...(imageStyle || {}),
  };

  const placeholderStyle: ViewStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.borderRadius,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
    ...(showCreatorBorder && isCreator && {
      width: config.width - config.borderWidth * 2,
      height: config.height - config.borderWidth * 2,
      borderRadius: config.borderRadius - config.borderWidth,
    }),
  };

  const avatarTextStyle: TextStyle = {
    color: '#FFFFFF',
    fontSize: config.fontSize,
    fontWeight: '600',
    ...(textStyle || {}),
  };

  if (disabled) {
    return (
      <View style={avatarStyle}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={containerImageStyle} />
        ) : (
          <View style={placeholderStyle}>
            <Text style={avatarTextStyle}>
              {user.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={avatarStyle}
      onPress={handlePress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`View ${user.username}'s profile`}
    >
      {user.picture ? (
        <Image source={{ uri: user.picture }} style={containerImageStyle} />
      ) : (
        <View style={placeholderStyle}>
          <Text style={avatarTextStyle}>
            {user.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Add any default styles if needed
});