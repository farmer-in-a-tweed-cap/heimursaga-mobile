import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';
import { X } from 'phosphor-react-native';
import { ProfileSettingsSection } from '../components/settings/ProfileSettingsSection';
import { AccountSettingsSection } from '../components/settings/AccountSettingsSection';

type NavigationProp = StackNavigationProp<MainStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: NavigationProp;
}

type SettingsSection = 'profile' | 'account';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1C1C1E" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'profile' && styles.tabActive]}
          onPress={() => setActiveSection('profile')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'profile' && styles.tabTextActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'account' && styles.tabActive]}
          onPress={() => setActiveSection('account')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'account' && styles.tabTextActive,
            ]}
          >
            Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeSection === 'profile' && <ProfileSettingsSection />}
        {activeSection === 'account' && <AccountSettingsSection />}
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

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingHorizontal: 20,
  },

  tab: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: '#AC6D46',
  },

  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },

  tabTextActive: {
    color: '#AC6D46',
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 24,
  },
});
