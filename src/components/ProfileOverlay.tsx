import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  MapPin, 
  Calendar, 
  BookOpen, 
  Heart, 
  Users, 
  PencilSimple,
  Camera,
  Globe,
  Link,
} from 'phosphor-react-native';
import { api } from '../api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface User {
  id: string;
  username: string;
  picture?: string;
  bio?: string;
  locationFrom?: string;
  locationLives?: string;
  joinedDate?: Date;
  creator?: boolean;
  portfolio?: string;
  followed?: boolean;
  stats?: {
    totalEntries?: number;
    favoriteLocations?: string[];
    totalDistance?: number;
    countriesVisited?: number;
    journeysCount?: number;
  };
}

interface ProfileOverlayProps {
  visible: boolean;
  user: User | null;
  isLoading?: boolean;
  isOwnProfile?: boolean;
  onClose: () => void;
  onUpdateProfile?: (updatedUser: Partial<User>) => void;
  onViewJournal?: (username: string) => void;
}

export const ProfileOverlay: React.FC<ProfileOverlayProps> = ({ 
  visible, 
  user,
  isLoading = false,
  isOwnProfile = false,
  onClose, 
  onUpdateProfile,
  onViewJournal
}) => {
  const insets = useSafeAreaInsets();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(user?.bio || '');
  const [editedLocationFrom, setEditedLocationFrom] = useState(user?.locationFrom || '');
  const [editedLocationLives, setEditedLocationLives] = useState(user?.locationLives || '');
  const [editedPortfolio, setEditedPortfolio] = useState(user?.portfolio || '');
  const [isFollowing, setIsFollowing] = useState(user?.followed || false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Update follow state when user data changes
  useEffect(() => {
    if (user?.followed !== undefined) {
      setIsFollowing(user.followed);
    }
  }, [user?.followed]);

  // Update edited fields when user data changes
  useEffect(() => {
    setEditedBio(user?.bio || '');
    setEditedLocationFrom(user?.locationFrom || '');
    setEditedLocationLives(user?.locationLives || '');
    setEditedPortfolio(user?.portfolio || '');
  }, [user?.bio, user?.locationFrom, user?.locationLives, user?.portfolio]);

  const handleSave = async () => {
    console.log('🔥 handleSave called');
    try {
      // Update the API with new profile data
      const updateData = {
        bio: editedBio.trim(),
        from: editedLocationFrom.trim(),
        livesIn: editedLocationLives.trim(),
        portfolio: editedPortfolio.trim(),
      };
      
      console.log('🔥 Updating profile with data:', updateData);
      const response = await api.users.updateUserProfileSettings(updateData);
      console.log('🔥 Profile update response:', response);
      
      // Map the API field names back to our local field names for state update
      const localUpdateData = {
        bio: updateData.bio,
        locationFrom: updateData.from,
        locationLives: updateData.livesIn,
        portfolio: updateData.portfolio,
      };
      
      if (onUpdateProfile) {
        onUpdateProfile(localUpdateData);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('🔥 Failed to update profile:', error);
      // Could show an error alert here
    }
  };

  const handleCancel = () => {
    setEditedBio(user?.bio || '');
    setEditedLocationFrom(user?.locationFrom || '');
    setEditedLocationLives(user?.locationLives || '');
    setEditedPortfolio(user?.portfolio || '');
    setIsEditing(false);
  };

  const handleFollowToggle = async () => {
    if (isFollowLoading || !user?.username) return;
    
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await api.users.unfollowUser(user.username);
        setIsFollowing(false);
      } else {
        await api.users.followUser(user.username);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Failed to toggle follow status:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const formatJoinDate = (date?: Date) => {
    if (!date) return 'Recently';
    return `Joined ${date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Drawer Handle */}
        <View style={styles.drawerHandle} />
        
        {/* Header */}
        <View style={styles.header}>
          <View />
          
          <View />
          
          {isOwnProfile ? (
            <TouchableOpacity 
              onPress={isEditing ? handleSave : () => setIsEditing(true)} 
              style={styles.editButton}
            >
              {isEditing ? (
                <Text style={styles.editButtonText}>Save</Text>
              ) : (
                <PencilSimple size={20} color="#AC6D46" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.editButton} />
          )}
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView 
            style={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContentContainer}
          >
          {/* Loading State */}
          {isLoading && !user ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingProfileSection}>
                <View style={styles.loadingImagePlaceholder} />
                <View style={styles.loadingTextPlaceholder} />
                <View style={styles.loadingButtonsPlaceholder}>
                  <View style={styles.loadingButtonPlaceholder} />
                  <View style={styles.loadingButtonPlaceholder} />
                </View>
              </View>
            </View>
          ) : user ? (
            <>
              {/* Profile Image & Basic Info */}
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  {user?.picture ? (
                    <Image 
                      source={{ uri: user.picture }} 
                      style={[
                        styles.profileImage,
                        user?.creator && styles.creatorImageBorder
                      ]} 
                    />
                  ) : (
                    <View style={[
                      styles.profileImagePlaceholder,
                      user?.creator && styles.creatorImageBorder
                    ]}>
                      <Text style={styles.profileImageText}>
                        {user?.username?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  {isOwnProfile && isEditing && (
                    <TouchableOpacity style={styles.cameraButton}>
                      <Camera size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {user?.creator && (
                  <View style={styles.explorerBadge}>
                    <Text style={styles.explorerBadgeText}>Explorer Pro</Text>
                  </View>
                )}
                
                <Text style={styles.username}>{user?.username || 'Loading...'}</Text>
                
                {/* Bio in profile section */}
                {isOwnProfile && isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      value={editedBio}
                      onChangeText={setEditedBio}
                      placeholder="Tell others about yourself..."
                      multiline
                      style={styles.bioInput}
                      maxLength={300}
                    />
                    <Text style={styles.characterCount}>
                      {editedBio.length}/300
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.profileBioText}>
                    {user?.bio && user.bio.trim() ? user.bio : (isOwnProfile ? 'No bio added yet. Share something about yourself!' : `${user?.username || 'User'} hasn't added a bio yet.`)}
                  </Text>
                )}
            
            {/* Follow Button and View Journal Button - only show for other users */}
            {!isOwnProfile && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.followButton, 
                    isFollowing && styles.followingButton,
                    isFollowLoading && styles.followButtonDisabled
                  ]}
                  activeOpacity={0.7}
                  onPress={handleFollowToggle}
                  disabled={isFollowLoading}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {isFollowLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.journalButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!user || !user.username) {
                      return;
                    }
                    
                    if (onViewJournal) {
                      onViewJournal(user.username);
                      onClose();
                    }
                  }}
                >
                  <Text style={styles.journalButtonText}>View Journal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>


          {/* Location Section */}
          {((user?.locationFrom && user.locationFrom.trim()) || (user?.locationLives && user.locationLives.trim()) || (isOwnProfile && isEditing)) && (
            <View style={styles.section}>
              {isOwnProfile && isEditing ? (
                <View style={styles.locationEditContainer}>
                  <TextInput
                    value={editedLocationFrom}
                    onChangeText={setEditedLocationFrom}
                    placeholder="From (birthplace/hometown)"
                    style={styles.locationInput}
                    maxLength={100}
                  />
                  <TextInput
                    value={editedLocationLives}
                    onChangeText={setEditedLocationLives}
                    placeholder="Currently (current location)"
                    style={[styles.locationInput, { marginTop: 12 }]}
                    maxLength={100}
                  />
                </View>
              ) : (
                <View style={styles.locationColumnsContainer}>
                  {user?.locationFrom && user.locationFrom.trim() && (
                    <View style={styles.locationColumn}>
                      <View style={styles.locationRow}>
                        <MapPin size={16} color="#AC6D46" />
                        <Text style={styles.locationLabel}>From</Text>
                      </View>
                      <Text style={styles.locationValue}>{user?.locationFrom}</Text>
                    </View>
                  )}
                  {user?.locationLives && user.locationLives.trim() && (
                    <View style={styles.locationColumn}>
                      <View style={styles.locationRow}>
                        <MapPin size={16} color="#AC6D46" />
                        <Text style={styles.locationLabel}>Currently</Text>
                      </View>
                      <Text style={styles.locationValue}>{user?.locationLives}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Portfolio Section */}
          {(user?.creator && ((user?.portfolio && user.portfolio.trim()) || (isOwnProfile && isEditing))) && (
            <View style={styles.section}>
              {isOwnProfile && isEditing ? (
                <View style={styles.portfolioColumn}>
                  <View style={styles.locationRow}>
                    <Link size={16} color="#AC6D46" />
                    <Text style={styles.locationLabel}>Portfolio/Social</Text>
                  </View>
                  <TextInput
                    value={editedPortfolio}
                    onChangeText={setEditedPortfolio}
                    placeholder="Website or social media link"
                    style={styles.locationInput}
                    maxLength={200}
                  />
                </View>
              ) : (
                <View style={styles.portfolioColumn}>
                  <View style={styles.locationRow}>
                    <Link size={16} color="#AC6D46" />
                    <Text style={styles.locationLabel}>Portfolio/Social</Text>
                  </View>
                  <Text style={styles.portfolioLink}>
                    {user?.portfolio}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Explorer Stats Section */}
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {user?.stats?.totalEntries || 0}
                </Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {user?.stats?.journeysCount || 0}
                </Text>
                <Text style={styles.statLabel}>Journeys</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {user?.stats?.countriesVisited || 0}
                </Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
            </View>
          </View>

          {/* Favorite Locations */}
          {user?.stats?.favoriteLocations && user.stats.favoriteLocations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={20} color="#AC6D46" />
                <Text style={styles.sectionTitle}>Favorite Places</Text>
              </View>
              
              <View style={styles.favoritesList}>
                {user?.stats?.favoriteLocations?.slice(0, 5).map((location, index) => (
                  <View key={index} style={styles.favoriteItem}>
                    <MapPin size={14} color="#AC6D46" />
                    <Text style={styles.favoriteText}>{location}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cancel Button for Editing Mode */}
          {isOwnProfile && isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
            </>
          ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  closeButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  editButton: {
    padding: 4,
    minWidth: 44,
    alignItems: 'center',
  },

  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AC6D46',
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  profileSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  creatorImageBorder: {
    borderWidth: 4,
    borderColor: '#AC6D46',
  },

  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileImageText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '600',
  },

  cameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  username: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },

  joinDate: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },

  editContainer: {
    position: 'relative',
  },

  bioInput: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },

  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 8,
  },

  bioText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
  },

  locationInput: {
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },

  locationText: {
    fontSize: 16,
    color: '#1C1C1E',
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#AC6D46',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  favoritesList: {
    gap: 12,
  },

  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  favoriteText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
  },

  editActions: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },

  locationEditContainer: {
    gap: 12,
  },

  locationContainer: {
    gap: 12,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 6,
  },

  locationValue: {
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },

  portfolioLink: {
    fontSize: 16,
    color: '#AC6D46',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },

  followButton: {
    backgroundColor: '#AC6D46',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    flex: 1,
  },

  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  followingButton: {
    backgroundColor: '#E5E5EA',
    borderWidth: 1,
    borderColor: '#AC6D46',
  },

  followingButtonText: {
    color: '#AC6D46',
  },

  followButtonDisabled: {
    opacity: 0.6,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  journalButton: {
    backgroundColor: '#AC6D46',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    flex: 1,
  },

  journalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Loading states
  loadingContainer: {
    padding: 16,
  },

  loadingProfileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    marginBottom: 16,
  },

  loadingTextPlaceholder: {
    width: 120,
    height: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    marginBottom: 16,
  },

  loadingButtonsPlaceholder: {
    flexDirection: 'row',
    gap: 12,
  },

  loadingButtonPlaceholder: {
    width: 100,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },

  drawerHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },

  explorerBadge: {
    backgroundColor: '#AC6D46',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },

  explorerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  profileBioText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },

  locationColumnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },

  locationColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  portfolioColumn: {
    alignItems: 'center',
  },
});