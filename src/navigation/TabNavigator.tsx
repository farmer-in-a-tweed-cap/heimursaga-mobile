import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Globe, BookOpen, BookmarkSimple, Feather } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { ExploreScreen } from '../screens/ExploreScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { useAuth } from '../hooks';
import { api } from '../api';
import { Avatar } from '../components/ui';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from './types';

export type TabParamList = {
  Explore: undefined;
  Journal: undefined;
  Bookmarks: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

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

interface UserAvatarProps {
  navigation: NavigationProp;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();

  // Fetch user profile to check creator status
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      return api.users.getUserByUsername(user.username);
    },
    enabled: isAuthenticated && !!user?.username,
  });

  const isCreator = user?.role === 'creator' || userProfile?.data?.creator;

  const handlePress = () => {
    navigation.navigate('Submenu');
  };

  return (
    <TouchableOpacity
      style={[
        styles.avatarButton,
        isCreator && styles.avatarButtonCreator
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
  );
};

type NavigationProp = StackNavigationProp<MainStackParamList>;

interface LogEntryButtonProps {
  navigation: NavigationProp;
}

const LogEntryButton: React.FC<LogEntryButtonProps> = ({ navigation }) => {
  const handleLogEntry = () => {
    navigation.navigate('LogEntry', {});
  };

  return (
    <TouchableOpacity style={styles.logButton} onPress={handleLogEntry}>
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

interface TabNavigatorProps {
  navigation: NavigationProp;
}

export const TabNavigator: React.FC<TabNavigatorProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = React.useState('Explore');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Explore':
        return <ExploreScreen />;
      case 'Journal':
        return <JournalScreen />;
      case 'Bookmarks':
        return <BookmarksScreen />;
      default:
        return <ExploreScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      
      {/* Custom Bottom Navigation */}
      <View style={styles.bottomNav}>
        <UserAvatar navigation={navigation} />

        <View style={styles.centerTabs}>
          {['Explore', 'Journal', 'Bookmarks'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <TabIcon name={tab.toLowerCase()} focused={activeTab === tab} />
              <TabLabel title={tab} focused={activeTab === tab} />
            </TouchableOpacity>
          ))}
        </View>

        <LogEntryButton navigation={navigation} />
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
    width: 44, // Account for border
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
    width: 44, // Account for border
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