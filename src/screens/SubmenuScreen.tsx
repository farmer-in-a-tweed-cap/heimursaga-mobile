import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';
import {
  SignOut,
  Gear,
  BookOpen,
  EnvelopeSimple,
  X,
  CaretRight,
} from 'phosphor-react-native';
import { useAuth } from '../hooks';
import { Avatar } from '../components/ui';

type NavigationProp = StackNavigationProp<MainStackParamList, 'Submenu'>;

interface SubmenuScreenProps {
  navigation: NavigationProp;
}

export const SubmenuScreen: React.FC<SubmenuScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Tabs' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleUserGuide = () => {
    // TODO: Navigate to user guide or open web link
    Alert.alert('User Guide', 'User guide coming soon!');
  };

  const handleContact = () => {
    // TODO: Navigate to contact screen or open email
    Linking.openURL('mailto:support@heimursaga.com').catch(() => {
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const menuItems = [
    {
      icon: Gear,
      label: 'Settings',
      onPress: handleSettings,
      color: '#4676AC',
    },
    {
      icon: BookOpen,
      label: 'User Guide',
      onPress: handleUserGuide,
      color: '#4676AC',
    },
    {
      icon: EnvelopeSimple,
      label: 'Contact Support',
      onPress: handleContact,
      color: '#4676AC',
    },
    {
      icon: SignOut,
      label: 'Logout',
      onPress: handleLogout,
      color: '#EF4444',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1C1C1E" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Section */}
        {user && (
          <View style={styles.userSection}>
            <Avatar user={user} size="large" disabled={true} />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{user.username}</Text>
              {user.email && (
                <Text style={styles.email}>{user.email}</Text>
              )}
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                  <item.icon size={22} color={item.color} weight="regular" />
                </View>
                <Text
                  style={[
                    styles.menuItemText,
                    item.label === 'Logout' && styles.menuItemTextDanger,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <CaretRight size={20} color="#C7C7CC" weight="regular" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Heimursaga Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  closeButton: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  userSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  userInfo: {
    flex: 1,
  },

  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },

  email: {
    fontSize: 14,
    color: '#8E8E93',
  },

  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F7',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },

  menuItemLast: {
    borderBottomWidth: 0,
  },

  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },

  menuItemTextDanger: {
    color: '#EF4444',
  },

  versionSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  versionText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
