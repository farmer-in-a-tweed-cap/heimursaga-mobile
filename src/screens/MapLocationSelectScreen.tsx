import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { Screen, Button } from '../components/ui';
import { Colors } from '../theme/colors';
import { Check, X, MapPin, MagnifyingGlass } from 'phosphor-react-native';
import { MapView, MapViewRef } from '../components/map/MapView';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

interface MapLocationSelectScreenProps {
  navigation: any;
  route?: {
    params?: {
      initialLocation?: { lat: number; lon: number };
      onLocationSelect?: (location: { lat: number; lon: number }) => void;
    };
  };
}

export const MapLocationSelectScreen: React.FC<MapLocationSelectScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { initialLocation, onLocationSelect } = route?.params || {};
  
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(
    initialLocation || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const mapViewRef = useRef<MapViewRef>(null);
  
  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    setSelectedLocation({ lat: coordinate.latitude, lon: coordinate.longitude });
    setShowResults(false);
  };

  const handleSearchQueryChange = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&types=place,locality,region,country`
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.features || []);
          setShowResults(true);
        }
      } catch (error) {
        // Handle search API errors gracefully
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSearchResultSelect = useCallback((result: any) => {
    // Extract coordinates from Mapbox result
    const [lon, lat] = result.center;
    setShowResults(false);
    setSearchQuery(result.place_name);
    Keyboard.dismiss();

    // Fly the map to the selected location without placing marker
    if (mapViewRef.current) {
      // Determine zoom level based on place type
      let zoomLevel = 12; // Default
      if (result.place_type) {
        if (result.place_type.includes('country')) zoomLevel = 4;
        else if (result.place_type.includes('region')) zoomLevel = 6;
        else if (result.place_type.includes('place')) zoomLevel = 10;
        else if (result.place_type.includes('locality')) zoomLevel = 12;
      }

      mapViewRef.current.centerOnLocation(lon, lat, zoomLevel);
    }
  }, []);

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please tap on the map to select a location');
      return;
    }
    
    if (onLocationSelect) {
      onLocationSelect(selectedLocation);
    }
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <X size={24} color={Colors.text.primary} weight="regular" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity 
            onPress={handleConfirm}
            style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
          >
            <Check size={24} color={selectedLocation ? Colors.secondary : Colors.disabled} weight="bold" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MagnifyingGlass size={16} color={Colors.text.secondary} weight="regular" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a location..."
              placeholderTextColor={Colors.placeholder}
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={() => {
                if (searchResults.length > 0) {
                  handleSearchResultSelect(searchResults[0]);
                }
              }}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <Text style={styles.searchingIndicator}>🔍</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <MapPin size={16} color={Colors.text.secondary} weight="regular" />
          <Text style={styles.instructionsText}>
            Search above or tap on the map to select your location
          </Text>
        </View>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => item.id || `search-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultSelect(item)}
                >
                  <MapPin size={16} color={Colors.primary} weight="regular" />
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {item.place_name}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Map */}
        <View style={[styles.mapContainer, showResults && styles.mapContainerWithResults]}>
          <MapView
            ref={mapViewRef}
            initialLocation={initialLocation || undefined}
            selectedLocation={selectedLocation || undefined}
            onMapPress={handleMapPress}
            showsUserLocation={true}
            followsUserLocation={false}
          />
        </View>

        {/* Location Info */}
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Selected Location</Text>
            <Text style={styles.coordinates}>
              Lat: {selectedLocation.lat.toFixed(6)}, Lon: {selectedLocation.lon.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  
  cancelButton: {
    padding: 8,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  
  confirmButton: {
    padding: 8,
  },
  
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
  },
  
  instructionsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  
  mapContainer: {
    flex: 1,
  },
  
  locationInfo: {
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  
  coordinates: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 8,
    paddingVertical: 4,
  },

  searchingIndicator: {
    fontSize: 14,
    marginLeft: 8,
  },

  searchResultsContainer: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
    maxHeight: 200,
  },

  searchResultsList: {
    paddingVertical: 4,
  },

  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
  },

  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 12,
  },

  mapContainerWithResults: {
    flex: 0.7,
  },
});