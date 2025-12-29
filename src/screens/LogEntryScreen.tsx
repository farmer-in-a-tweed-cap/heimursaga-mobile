import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Screen, Button } from '../components/ui';
import { Colors } from '../theme/colors';
import { MapPin, Calendar, Camera, Check, X } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { validation, validateField, validationRules } from '../utils/validation';
import { useAuth } from '../hooks';
import { api } from '../api';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';

interface LogEntryFormData {
  title: string;
  content: string;
  place: string;
  date: Date;
}

type NavigationProp = StackNavigationProp<MainStackParamList>;

interface LogEntryScreenProps {
  navigation: NavigationProp;
  route?: {
    params?: {
      waypoint?: {
        id: number;
        title?: string;
        lat: number;
        lon: number;
      };
    };
  };
}

interface PhotoItem {
  id: string;
  uri: string;
  type: string;
  fileName: string;
  caption?: string;
}

export const LogEntryScreen: React.FC<LogEntryScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const waypoint = route?.params?.waypoint;
  
  const [isPublic, setIsPublic] = useState(true);
  const [isSponsored, setIsSponsored] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    waypoint ? { lat: waypoint.lat, lon: waypoint.lon } : null
  );
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<LogEntryFormData>({
    defaultValues: {
      title: '',
      content: '',
      place: waypoint?.title || '',
      date: new Date(),
    },
  });

  const watchedContent = watch('content');
  const wordCount = watchedContent ? watchedContent.trim().split(/\s+/).filter(word => word.length > 0).length : 0;

  const getWordCountColor = () => {
    if (!isPublic) return Colors.text.secondary;
    if (wordCount < 100) return Colors.error;
    if (wordCount > 1000) return Colors.error;
    if (wordCount > 900) return Colors.warning;
    return Colors.success;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      setValue('date', selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
  };

  const handleLocationSelect = () => {
    navigation.navigate('MapLocationSelect', {
      initialLocation: selectedLocation || undefined,
      onLocationSelect: (location: { lat: number; lon: number }) => {
        setSelectedLocation(location);
      },
    });
  };

  const handlePhotoUpload = () => {
    if (photos.length >= 3) {
      Alert.alert('Maximum Photos', 'You can upload up to 3 photos');
      return;
    }

    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImageLibrary() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      handleImagePickerResponse
    );
  };

  const openImageLibrary = () => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: Math.min(3 - photos.length, 3),
      },
      handleImagePickerResponse
    );
  };

  const handleImagePickerResponse = (response: ImagePickerResponse) => {
    console.log('Image picker response:', response);
    
    if (response.didCancel || response.errorMessage || !response.assets) {
      console.log('Image picker cancelled or error:', response.errorMessage);
      return;
    }

    console.log('Processing assets:', response.assets);
    const newPhotos: PhotoItem[] = response.assets.map((asset, index) => ({
      id: `photo_${Date.now()}_${index}`,
      uri: asset.uri || '',
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `photo_${Date.now()}_${index}.jpg`,
      caption: '',
    }));

    console.log('New photos created:', newPhotos);
    setPhotos(prev => {
      const updated = [...prev, ...newPhotos];
      console.log('Photos state updated:', updated);
      return updated;
    });
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const updatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, caption } : photo
    ));
  };

  const validatePublicEntry = (content: string) => {
    if (isPublic && content) {
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      if (words.length < 100) {
        return 'Public entries must be at least 100 words';
      }
      if (words.length > 1000) {
        return 'Content must not exceed 1000 words';
      }
    }
    return true;
  };

  const onSubmit = async (data: LogEntryFormData) => {
    console.log('Form submitted with photos:', photos);
    console.log('Current photos state:', photos.length, 'photos');
    
    if (!selectedLocation) {
      Alert.alert('Location Required', 'Please select a location for your entry');
      return;
    }

    // Validate public entry word count
    const contentValidation = validatePublicEntry(data.content);
    if (contentValidation !== true) {
      Alert.alert('Content Error', contentValidation);
      return;
    }

    setIsSubmitting(true);

    try {
      // First, upload photos if any
      const uploadedPhotoIds: string[] = [];
      const photoCaptions: { [key: string]: string } = {};

      console.log(`Starting photo upload for ${photos.length} photos`);
      for (const photo of photos) {
        try {
          console.log('Uploading photo:', photo.fileName, 'URI:', photo.uri);
          
          // Create FormData for photo upload
          const formData = new FormData();
          formData.append('file', {
            uri: photo.uri,
            type: photo.type,
            name: photo.fileName,
          } as any);

          console.log('FormData created, making upload request...');
          // Upload the photo
          const uploadResponse = await api.upload.uploadImage(formData);
          console.log('Upload response:', uploadResponse);
          
          if (uploadResponse?.data?.id) {
            console.log('Photo uploaded successfully, ID:', uploadResponse.data.id);
            uploadedPhotoIds.push(uploadResponse.data.id);
            if (photo.caption?.trim()) {
              photoCaptions[uploadResponse.data.id] = photo.caption.trim();
            }
          } else if (uploadResponse?.id) {
            // Handle case where ID is directly in response
            console.log('Photo uploaded successfully (direct ID), ID:', uploadResponse.id);
            uploadedPhotoIds.push(uploadResponse.id);
            if (photo.caption?.trim()) {
              photoCaptions[uploadResponse.id] = photo.caption.trim();
            }
          } else {
            console.warn('Upload response missing ID:', uploadResponse);
          }
        } catch (uploadError) {
          console.warn('Failed to upload photo:', photo.fileName, uploadError);
          console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
          // Continue with other photos even if one fails
        }
      }
      
      console.log('Photo upload completed. Uploaded IDs:', uploadedPhotoIds);
      console.log('Photo captions:', photoCaptions);

      const postData = {
        title: data.title.trim(),
        content: data.content.trim(),
        place: data.place.trim(),
        date: data.date,
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        public: isPublic,
        sponsored: isSponsored,
        waypointId: waypoint?.id,
        uploads: uploadedPhotoIds,
        uploadCaptions: photoCaptions,
        isDraft: false,
      };

      console.log('Creating post with data:', postData);
      const response = await api.posts.createPost(postData);
      console.log('API response:', response);
      
      if (response?.id || response?.success || response?.data) {
        Alert.alert(
          'Success!', 
          'Your journey entry has been logged successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        console.log('API call failed - response:', response);
        throw new Error(`API call failed: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // More specific error message
      let errorMessage = 'Failed to create entry. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid data. Please check your entry.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Screen style={styles.screenBackground}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <X size={24} color={Colors.text.primary} weight="regular" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {watch('title') || 'New Entry'}
          </Text>
          <TouchableOpacity 
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          >
            <Check size={24} color={isSubmitting ? Colors.disabled : Colors.secondary} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity 
              style={styles.locationButton} 
              onPress={handleLocationSelect}
            >
              <MapPin size={20} color={Colors.secondary} weight="regular" />
              <Text style={styles.locationText}>
                {selectedLocation 
                  ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lon.toFixed(4)}`
                  : waypoint 
                    ? `${waypoint.title || 'Selected Location'}` 
                    : 'Select location on map'
                }
              </Text>
            </TouchableOpacity>
            {waypoint && !selectedLocation && (
              <Text style={styles.coordinatesText}>
                [{waypoint.lon.toFixed(4)}, {waypoint.lat.toFixed(4)}]
              </Text>
            )}
          </View>

          {/* Title Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title</Text>
            <Text style={styles.sectionSubtitle}>A unique and descriptive title</Text>
            <Controller
              control={control}
              name="title"
              rules={{
                required: 'Title is required',
                maxLength: { value: 50, message: 'Title must not exceed 50 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.titleInput, errors.title && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your entry title"
                  placeholderTextColor={Colors.placeholder}
                  maxLength={50}
                />
              )}
            />
            {errors.title && (
              <Text style={styles.errorText}>{errors.title.message}</Text>
            )}
          </View>

          {/* Date Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <Text style={styles.sectionSubtitle}>When it happened</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={16} color={Colors.secondary} weight="regular" />
              <Text style={styles.dateText}>{formatDate(watch('date'))}</Text>
            </TouchableOpacity>
          </View>

          {/* Place Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Place</Text>
            <Text style={styles.sectionSubtitle}>Name of the place</Text>
            <Controller
              control={control}
              name="place"
              rules={{
                required: 'Place is required',
                maxLength: { value: 50, message: 'Place must not exceed 50 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.placeInput, errors.place && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Place name"
                  placeholderTextColor={Colors.placeholder}
                  maxLength={50}
                />
              )}
            />
            {errors.place && (
              <Text style={styles.errorText}>{errors.place.message}</Text>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.section}>
            <View style={styles.contentHeader}>
              <Text style={styles.sectionTitle}>Tell your story</Text>
              <Text style={[styles.wordCount, { color: getWordCountColor() }]}>
                {wordCount} {isPublic ? '/ 1000 words' : 'words'}
              </Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {isPublic ? 'Public entries: 100-1,000 words' : 'Private entries: any length'}
            </Text>
            <Controller
              control={control}
              name="content"
              rules={{
                required: 'Content is required',
                validate: validatePublicEntry,
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.contentInput, errors.content && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Share your journey experience..."
                  placeholderTextColor={Colors.placeholder}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              )}
            />
            {errors.content && (
              <Text style={styles.errorText}>{errors.content.message}</Text>
            )}
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length}/3)</Text>
            
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoContainer}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(photo.id)}
                    >
                      <X size={16} color={Colors.background.primary} weight="bold" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.photoCaptionInput}
                      placeholder="Add caption..."
                      placeholderTextColor={Colors.placeholder}
                      value={photo.caption}
                      onChangeText={(text) => updatePhotoCaption(photo.id, text)}
                      maxLength={100}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            
            {photos.length < 3 && (
              <TouchableOpacity style={styles.photoButton} onPress={handlePhotoUpload}>
                <Camera size={24} color={Colors.secondary} weight="regular" />
                <Text style={styles.photoButtonText}>
                  {photos.length === 0 ? 'Add photos' : 'Add more photos'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Publishing</Text>
            
            <View style={styles.privacyRow}>
              <View style={styles.privacyOption}>
                <Text style={styles.privacyLabel}>Public</Text>
                <TouchableOpacity
                  style={[styles.toggle, isPublic && styles.toggleActive]}
                  onPress={() => {
                    setIsPublic(!isPublic);
                    if (!isPublic) {
                      setIsSponsored(false);
                    }
                  }}
                >
                  {isPublic && <View style={styles.toggleIndicator} />}
                </TouchableOpacity>
              </View>

              {user && 'creator' in user && user.creator ? (
                <View style={styles.privacyOption}>
                  <Text style={styles.privacyLabel}>Sponsored</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle, 
                      isSponsored && styles.toggleActive,
                      !isPublic && styles.toggleDisabled
                    ]}
                    onPress={() => setIsSponsored(!isSponsored)}
                    disabled={!isPublic}
                  >
                    {isSponsored && <View style={styles.toggleIndicator} />}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              title="Log Entry"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>

        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.iosDatePickerContainer}>
            <View style={styles.iosDatePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDateConfirm}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={watch('date')}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date()}
              style={styles.iosDatePicker}
              textColor={Colors.text.primary}
              accentColor={Colors.primary}
            />
          </View>
        )}
        
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={watch('date')}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    backgroundColor: '#F9FAFB', // Gray-50
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: Colors.background.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  cancelButton: {
    padding: 8,
  },
  
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  
  saveButton: {
    padding: 8,
  },
  
  saveButtonDisabled: {
    opacity: 0.5,
  },
  
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Gray-50
  },
  
  section: {
    backgroundColor: Colors.background.primary,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  locationText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  
  coordinatesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  
  titleInput: {
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  dateText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
  },
  
  placeInput: {
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  wordCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  contentInput: {
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    minHeight: 120,
  },
  
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderStyle: 'dashed',
  },
  
  photoButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  photoScroll: {
    marginBottom: 16,
  },
  
  photoContainer: {
    marginRight: 12,
    width: 120,
  },
  
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
  },
  
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  photoCaptionInput: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  privacyOption: {
    alignItems: 'center',
  },
  
  privacyLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border.primary,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  
  toggleActive: {
    backgroundColor: Colors.secondary,
    alignItems: 'flex-end',
  },
  
  toggleDisabled: {
    backgroundColor: Colors.disabled,
    opacity: 0.5,
  },
  
  toggleIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background.primary,
  },
  
  submitSection: {
    margin: 16,
    marginTop: 8,
  },
  
  submitButton: {
    backgroundColor: Colors.primary,
  },
  
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },

  iosDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
  },

  datePickerCancel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },

  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },

  iosDatePicker: {
    height: 200,
  },
});