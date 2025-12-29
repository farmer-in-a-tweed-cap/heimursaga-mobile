import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Globe, BookOpen, BookmarkSimple, Feather } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { JournalScreen } from './JournalScreen';
import { useAuth } from '../hooks';
import { api } from '../api';

export type UserJournalStackParamList = {
  UserJournal: { username: string };
};

type UserJournalScreenRouteProp = RouteProp<UserJournalStackParamList, 'UserJournal'>;
type UserJournalScreenNavigationProp = StackNavigationProp<UserJournalStackParamList, 'UserJournal'>;

interface UserJournalScreenProps {
  route: UserJournalScreenRouteProp;
  navigation: UserJournalScreenNavigationProp;
}

// Tab icon component
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const color = focused ? '#AC6D46' : '#8E8E93';
  const size = 24;
  const weight = focused ? 'fill' : 'regular';
  
  switch (name) {
    case 'explore':
      return <Globe size={size} color={color} weight={weight} />;
    case 'journal':
      return <BookOpen size={size} color={color} weight={weight} />;
    case 'bookmarks':
      return <BookmarkSimple size={size} color={color} weight={weight} />;
    default:
      return <Globe size={size} color={color} weight={weight} />;
  }
};

// User avatar component
const UserAvatar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      return api.users.getUserByUsername(user.username);
    },
    enabled: isAuthenticated && !!user?.username,
  });

  const isCreator = user?.role === 'creator' || userProfile?.creator;

  return (
    <View style={[styles.avatarButton, isCreator && styles.avatarButtonCreator]}>
      {user?.picture ? (
        <Image
          source={{ uri: user.picture }}
          style={[
            styles.avatar,
            isCreator && styles.avatarCreator
          ]}
        />
      ) : (
        <View style={[
          styles.avatarPlaceholder,
          isCreator && styles.avatarPlaceholderCreator
        ]}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </View>
  );
};

const LogEntryButton: React.FC = () => {
  return (
    <TouchableOpacity style={styles.logButton}>
      <Feather size={22} color="#FFFFFF" weight="bold" />
    </TouchableOpacity>
  );
};

const TabLabel: React.FC<{ title: string; focused: boolean }> = ({ title, focused }) => (
  <Text 
    style={[styles.label, focused && styles.labelFocused]}
    numberOfLines={1}
    adjustsFontSizeToFit={true}
    minimumFontScale={0.8}
  >
    {title}
  </Text>
);

export const UserJournalScreen: React.FC<UserJournalScreenProps> = ({ route }) => {
  const { username } = route.params;
  const navigation = useNavigation();
  
  const handleTabPress = (tab: string) => {
    // Navigate back to the main tabs and switch to the selected tab
    navigation.navigate('Tabs' as never);
  };
  
  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.screenContainer}>
        <JournalScreen username={username} />
      </View>
      
      {/* Custom Bottom Navigation */}
      <View style={styles.bottomNav}>
        <UserAvatar />
        
        <View style={styles.centerTabs}>
          {[
            { key: 'explore', label: 'Explore' },
            { key: 'journal', label: 'Journal' },
            { key: 'bookmarks', label: 'Bookmarks' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handleTabPress(tab.key)}
            >
              <TabIcon name={tab.key} focused={false} />
              <TabLabel title={tab.label} focused={false} />
            </TouchableOpacity>
          ))}
        </View>
        
        <LogEntryButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screenContainer: {
    flex: 1,
  },

  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    height: 84,
  },

  centerTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    flex: 1,
    minHeight: 52,
  },
  
  label: {
    fontSize: 12,
    marginTop: 4,
    color: '#8E8E93',
    textAlign: 'center',
    width: '100%',
  },
  
  labelFocused: {
    color: '#AC6D46',
    fontWeight: '600',
  },

  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },

  avatarButtonCreator: {
    borderWidth: 2,
    borderColor: '#AC6D46',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarCreator: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarPlaceholderCreator: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  logButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});