import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Avatar } from './ui';
import { useProfileOverlay } from '../contexts/ProfileOverlayContext';

interface User {
  id?: string;
  username: string;
  picture?: string;
  creator?: boolean;
  bio?: string;
  followed?: boolean;
}

interface UserCardProps {
  user: User;
  onPress?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  const { showProfile } = useProfileOverlay();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      showProfile(user.username);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <Avatar
        user={{
          username: user.username,
          picture: user.picture,
          creator: user.creator,
        }}
        size="small"
        disabled={true} // Disable avatar's own onPress since the card handles it
      />
      
      <View style={styles.userInfo}>
        <View style={styles.usernameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {user.username}
          </Text>
          {user.creator && (
            <Text style={styles.creatorBadge}>✓</Text>
          )}
        </View>
        
        {user.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginVertical: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  userInfo: {
    flex: 1,
    marginLeft: 10,
  },

  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },

  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },

  creatorBadge: {
    fontSize: 12,
    color: '#4676AC',
    marginLeft: 3,
  },

  bio: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 14,
  },
});