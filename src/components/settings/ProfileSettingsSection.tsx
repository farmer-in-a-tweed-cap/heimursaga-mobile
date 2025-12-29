import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera } from 'phosphor-react-native';
import { useAuth } from '../../hooks';
import { api } from '../../api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const ProfileSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [bio, setBio] = useState('');
  const [locationFrom, setLocationFrom] = useState('');
  const [locationLives, setLocationLives] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.picture);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile settings
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile-settings'],
    queryFn: async () => {
      try {
        const response = await api.users.getUserProfileSettings();
        // Handle the response format - it might be nested in a data property
        return response?.data || response || {};
      } catch (error) {
        console.error('Failed to fetch profile settings:', error);
        // Return empty object as fallback to prevent undefined error
        return {};
      }
    },
    enabled: !!user,
  });

  // Initialize form with fetched data
  useEffect(() => {
    if (profileData) {
      setBio(profileData.bio || '');
      setLocationFrom(profileData.from || '');
      setLocationLives(profileData.livesIn || '');
      setPortfolio(profileData.portfolio || '');
    }
  }, [profileData]);

  const isCreator = user?.role === 'creator';

  const handleImagePick = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1000,
        maxHeight: 1000,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setProfileImage(asset.uri);
          setSelectedImageFile(asset);
        }
      }
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Upload profile picture if changed
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedImageFile.uri,
          type: selectedImageFile.type || 'image/jpeg',
          name: selectedImageFile.fileName || 'profile.jpg',
        } as any);

        await api.users.updateUserPicture(formData);
      }

      // Update profile settings
      await api.users.updateUserProfileSettings({
        bio,
        from: locationFrom,
        livesIn: locationLives,
        portfolio: isCreator ? portfolio : undefined,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-profile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.username] });

      Alert.alert('Success', 'Profile updated successfully');
      setSelectedImageFile(null);
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedImageFile !== null ||
    bio !== (profileData?.bio || '') ||
    locationFrom !== (profileData?.from || '') ||
    locationLives !== (profileData?.livesIn || '') ||
    portfolio !== (profileData?.portfolio || '');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AC6D46" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={handleImagePick} style={styles.imageButton}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Camera size={20} color="#FFFFFF" weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to change</Text>
        </View>
      </View>

      {/* Read-only fields */}
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user?.email || ''}
          editable={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user?.username || ''}
          editable={false}
        />
      </View>

      {/* Editable fields */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.charCount}>{bio.length}/140</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#C7C7CC"
          multiline
          maxLength={140}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>From</Text>
        <TextInput
          style={styles.input}
          value={locationFrom}
          onChangeText={setLocationFrom}
          placeholder="Where are you from?"
          placeholderTextColor="#C7C7CC"
          maxLength={50}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Currently</Text>
        <TextInput
          style={styles.input}
          value={locationLives}
          onChangeText={setLocationLives}
          placeholder="Where are you now?"
          placeholderTextColor="#C7C7CC"
          maxLength={50}
        />
      </View>

      {/* Creator-only fields */}
      {isCreator && (
        <View style={styles.section}>
          <Text style={styles.label}>Portfolio / Social Links</Text>
          <TextInput
            style={styles.input}
            value={portfolio}
            onChangeText={setPortfolio}
            placeholder="https://instagram.com/username"
            placeholderTextColor="#C7C7CC"
            keyboardType="url"
            autoCapitalize="none"
            maxLength={500}
          />
        </View>
      )}

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },

  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },

  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  imageButton: {
    position: 'relative',
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
  },

  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imagePlaceholderText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9FAFB',
  },

  imageHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#8E8E93',
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },

  charCount: {
    fontSize: 13,
    color: '#8E8E93',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },

  inputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },

  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },

  saveButton: {
    backgroundColor: '#AC6D46',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
