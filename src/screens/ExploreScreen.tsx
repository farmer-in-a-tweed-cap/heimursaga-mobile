import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/ui';
import { Logo } from '../components/ui/Logo';
import { MapView, MapViewRef } from '../components/map/MapView';
import { WaypointCard, ExpandedWaypointView } from '../components/map';
import { List, MapPin, MagnifyingGlass, GpsFix } from 'phosphor-react-native';
import Geolocation from '@react-native-community/geolocation';
import { api } from '../api';
import { useAuth } from '../hooks';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

const { height: screenHeight } = Dimensions.get('window');

interface ExploreScreenProps {
  initialView?: 'map' | 'list';
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ initialView = 'map' }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const queryClient = useQueryClient();
  
  // Core state
  const [selectedWaypoint, setSelectedWaypoint] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filterMode, setFilterMode] = useState<'global' | 'following'>('global');
  
  // Drawer state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [shouldRenderDrawer, setShouldRenderDrawer] = useState(false);
  const [isClosingAnimated, setIsClosingAnimated] = useState(false);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const [fullEntryData, setFullEntryData] = useState<any>(null);
  
  // View state - following web app pattern
  const [showSearchOverlay, setShowSearchOverlay] = useState(true);
  const [showListView, setShowListView] = useState(false);
  const [hasEverSearched, setHasEverSearched] = useState(false);
  const [isMapAnimating, setIsMapAnimating] = useState(false);
  const [shouldLoadWaypoints, setShouldLoadWaypoints] = useState(false);

  // Check if overlay should be visible - only hide after search submission, not while typing
  const shouldShowOverlay = !hasEverSearched && showSearchOverlay;

  // Map state
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapState, setMapState] = useState<{
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    hasInitialized?: boolean;
  }>({});
  const [hasMapInteracted, setHasMapInteracted] = useState(false);
  const [isCenteringFromWaypoint, setIsCenteringFromWaypoint] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const drawerHeight = useRef(new Animated.Value(screenHeight * 0.4)).current;
  const drawerOpacity = useRef(new Animated.Value(1)).current;
  const drawerZIndex = useRef(new Animated.Value(1100)).current;
  const scrollOffsetY = useRef(0);
  const mapViewRef = useRef<MapViewRef>(null);

  // Single source of truth for all loaded waypoints with stable keys
  const [allWaypoints, setAllWaypoints] = useState<Map<string, any>>(new Map());
  
  // Filter waypoints based on current map bounds for list view
  const visibleWaypoints = React.useMemo(() => {
    if (!mapBounds || !mapBounds.ne || !mapBounds.sw) {
      return Array.from(allWaypoints.values());
    }

    // mapBounds structure: { ne: [lon, lat], sw: [lon, lat] }
    const north = mapBounds.ne[1];
    const south = mapBounds.sw[1];
    const east = mapBounds.ne[0];
    const west = mapBounds.sw[0];

    const filtered = Array.from(allWaypoints.values()).filter((waypoint) => {
      return (
        waypoint.lat >= south &&
        waypoint.lat <= north &&
        waypoint.lon >= west &&
        waypoint.lon <= east
      );
    });


    return filtered;
  }, [allWaypoints, mapBounds]);

  // Get waypoints only after search is performed and map animation is complete
  const { data: recentWaypoints, isLoading } = useQuery({
    queryKey: ['map-waypoints', mapBounds ? JSON.stringify(mapBounds) : 'global', filterMode], // Include filterMode in cache key
    queryFn: async () => {

      if (!shouldLoadWaypoints) {
        return null;
      }

      if (shouldShowOverlay) {
        return null;
      }

      if (mapBounds && mapBounds.ne && mapBounds.sw) {
        // Convert mapBounds { ne: [lon, lat], sw: [lon, lat] } to API format
        // API expects: { location: { bounds: { sw: { lat, lon }, ne: { lat, lon } } } }
        const result = await api.map.queryMap({
          location: {
            bounds: {
              sw: {
                lat: mapBounds.sw[1],
                lon: mapBounds.sw[0]
              },
              ne: {
                lat: mapBounds.ne[1],
                lon: mapBounds.ne[0]
              }
            }
          }
        });
        return result;
      }

      // Load waypoints when no bounds available (global)
      const result = await api.map.queryMap({
        context: 'global',
        limit: 100
      });
      return result;
    },
    enabled: isAuthenticated && shouldLoadWaypoints && !isMapAnimating && !shouldShowOverlay,
  });

  // Merge new waypoints into stable collection
  useEffect(() => {
    if (recentWaypoints?.waypoints) {
      setAllWaypoints(prevWaypoints => {
        const updated = new Map(prevWaypoints);
        
        // Add/update waypoints with stable keys
        recentWaypoints.waypoints.forEach((waypoint: any) => {
          const stableKey = waypoint.post?.id || `${waypoint.lat}_${waypoint.lon}`;
          updated.set(stableKey, waypoint);
        });
        
        return updated;
      });
    }
  }, [recentWaypoints]);

  // Function to determine continent from coordinates
  const getContinent = useCallback((lat: number, lon: number) => {
    // Simple continent detection based on coordinate ranges
    if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 60) {
      return 'Europe';
    } else if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) {
      return 'Africa';
    } else if (lat >= 5 && lat <= 55 && lon >= 60 && lon <= 180) {
      return 'Asia';
    } else if (lat >= 10 && lat <= 72 && lon >= -180 && lon <= -30) {
      return 'North America';
    } else if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -35) {
      return 'South America';
    } else if (lat >= -47 && lat <= -10 && lon >= 113 && lon <= 154) {
      return 'Australia';
    } else if (lat < -60) {
      return 'Antarctica';
    } else {
      // Check for Pacific islands
      if (lat >= -25 && lat <= 30 && ((lon >= 120 && lon <= 180) || (lon >= -180 && lon <= -130))) {
        return 'Oceania';
      }
      return 'the world';
    }
  }, []);

  const updateInProgress = useRef(false);

  // Function to update bounds from map
  const updateMapBounds = useCallback(async () => {
    if (updateInProgress.current) return;
    updateInProgress.current = true;

    try {
      if (mapViewRef.current) {
        const bounds = await mapViewRef.current.getCurrentBounds();
        if (bounds) {
          // Convert bounds format from {ne: {lat, lon}, sw: {lat, lon}} to [north, south, east, west]
          let boundsArray;
          if (bounds.ne && bounds.sw) {
            boundsArray = [bounds.ne.lat, bounds.sw.lat, bounds.ne.lon, bounds.sw.lon];
          } else if (Array.isArray(bounds) && bounds.length >= 4) {
            boundsArray = bounds;
          } else {
            return;
          }

          setMapBounds(boundsArray);

          // Enable waypoint loading when map bounds change through user interaction
          if (hasMapInteracted || hasEverSearched) {
            setShouldLoadWaypoints(true);
          }
        }
      }
    } finally {
      updateInProgress.current = false;
    }
  }, [hasMapInteracted, hasEverSearched]);



  // Handle map region changes from user interaction
  const handleMapRegionChange = useCallback(() => {
    // Don't update bounds if we're centering from waypoint press
    if (isCenteringFromWaypoint) {
      return;
    }
    setHasMapInteracted(true);
    updateMapBounds();
  }, [updateMapBounds, isCenteringFromWaypoint]);

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      return api.posts.bookmarkPost(postId);
    },
    onSuccess: () => {
      // Refresh waypoints data
      queryClient.invalidateQueries({ queryKey: ['recent-waypoints'] });
      queryClient.invalidateQueries({ queryKey: ['map-waypoints'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to bookmark post');
    },
  });

  const handleWaypointPress = (waypoint: any, fromListView = false) => {
    // Always update the selected waypoint immediately for instant marker highlighting
    setSelectedWaypoint(waypoint);
    setShouldRenderDrawer(true);
    setIsDrawerVisible(true);
    
    // Set centering flag to prevent region change interference
    setIsCenteringFromWaypoint(true);
    
    // Reset any closing animation state
    setIsClosingAnimated(false);
    
    // Clear the centering flag after MapView has time to center
    setTimeout(() => {
      setIsCenteringFromWaypoint(false);
    }, 1500); // Slightly longer than MapView's centering animation
    
    // Clear any previous full entry data to prevent showing stale data
    setFullEntryData(null);
    
    if (fromListView) {
      // From list view - go directly to expanded view
      setIsLoadingExpanded(true);
      setIsExpanded(false); // Start collapsed, then animate to expanded
      
      // Set drawer to expanded height immediately
      drawerHeight.setValue(screenHeight * 0.9);
      
      // Fetch full entry data and show expanded view
      if (waypoint.post?.id) {
        api.posts.getPostById(waypoint.post.id)
          .then((fullEntry) => {
            setFullEntryData(fullEntry);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          })
          .catch((error) => {
            setFullEntryData(waypoint);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          });
      } else {
        setFullEntryData(waypoint);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      }
    } else {
      // From map view - show collapsed detail drawer immediately
      setIsExpanded(false);
      setIsLoadingExpanded(false);
      
      // Set to collapsed height immediately - no animation delays
      drawerHeight.setValue(screenHeight * 0.4);
      translateY.setValue(0);
    }
  };

  const handleBookmarkPress = useCallback((waypoint: any) => {
    if (!waypoint.post?.id) return;
    bookmarkMutation.mutate(waypoint.post.id);
  }, [bookmarkMutation]);

  // Debounced search function
  const searchTimeoutRef = useRef<number | null>(null);
  const isSelectingRef = useRef(false);
  const searchInputRef = useRef<TextInput>(null);
  
  const handleSearchQueryChange = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
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
          setShowSearchResults(true);
        }
      } catch (error) {
        // Handle search API errors gracefully
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSearchResultSelect = useCallback((result: any) => {
    
    // Mark that we're selecting an item
    isSelectingRef.current = true;
    
    // Hide keyboard and search overlay
    Keyboard.dismiss();
    setShowSearchResults(false);
    setShowSearchOverlay(false);
    setHasEverSearched(true);
    setIsMapAnimating(true); // Start animation state
    
    // Update query
    setSearchQuery(result.place_name);
    
    // Determine zoom level based on feature type and bbox
    const [longitude, latitude] = result.center;
    
    if (mapViewRef.current) {
      const placeType = result.place_type?.[0] || '';
      
      if (result.bbox) {
        // Use bounding box if available (better for countries/regions)
        const [minLon, minLat, maxLon, maxLat] = result.bbox;
        
        // Debug logging
        
        // Debug the bounding box
        console.log(`Search result for "${result.place_name}":`, {
          bbox: result.bbox,
          placeType,
          minLon, minLat, maxLon, maxLat
        });
        
        // Use fitToBounds for all search results now that bounds order is fixed
        // Our MapView expects [northeast, southwest] order
        const bounds: [[number, number], [number, number]] = [
          [maxLon, maxLat], // northeast corner (first)
          [minLon, minLat], // southwest corner (second)
        ];
        
        const padding = 80;
        
        console.log('Using fitToBounds for', placeType, ':', bounds, 'with padding:', padding);
        
        mapViewRef.current.fitToBounds(bounds, 20);
      } else {
        // Fallback to center with appropriate zoom based on place type
        let zoomLevel = 8; // default (less aggressive)
        
        switch (placeType) {
          case 'country':
            zoomLevel = 3; // Much wider for countries without bounding box
            break;
          case 'region':
            zoomLevel = 5;
            break;
          case 'place':
          case 'locality':
            zoomLevel = 8;
            break;
          case 'district':
            zoomLevel = 10;
            break;
          default:
            zoomLevel = 12;
        }
        
        mapViewRef.current.centerOnLocation(longitude, latitude, zoomLevel);
        
        // Update map state immediately
        setMapState({
          centerCoordinate: [longitude, latitude],
          zoomLevel: zoomLevel,
          hasInitialized: true,
        });
      }
    }
    
    // After map animation completes, load waypoints
    setTimeout(() => {
      setIsMapAnimating(false);
      setShouldLoadWaypoints(true);
      // Update bounds to trigger waypoint loading
      updateMapBounds();
    }, 2000); // Wait for map animation to complete
    
    // Reset selection flag after a brief delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 200);
  }, [updateMapBounds]);

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setShowSearchResults(false);
  };

  const handleBackToSearch = () => {
    setShowSearchOverlay(true);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowListView(false);
    setHasEverSearched(false);
    setShouldLoadWaypoints(false); // Reset waypoint loading
    setIsMapAnimating(false);
    // Clear waypoints when returning to search overlay
    setAllWaypoints(new Map());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSearchOverlay(true);
    setShowListView(false);
    setHasEverSearched(false);
    setShouldLoadWaypoints(false); // Reset waypoint loading
    setIsMapAnimating(false);
    // Clear waypoints when clearing search and returning to overlay
    setAllWaypoints(new Map());
  };

  const handleGeolocate = useCallback(() => {
    setIsMapAnimating(true);
    setShowSearchOverlay(false);

    Geolocation.getCurrentPosition(
      (position: any) => {
        const { latitude, longitude } = position.coords;
        
        if (mapViewRef.current) {
          mapViewRef.current.centerOnLocation(longitude, latitude, 12);
          
          // Update map state
          setMapState({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 12,
            hasInitialized: true,
          });
        }
        
        // Set search query to indicate location search
        setSearchQuery('My Location');
        setHasEverSearched(true);
        
        // After map animation completes, load waypoints
        setTimeout(() => {
          setIsMapAnimating(false);
          setShouldLoadWaypoints(true);
          updateMapBounds();
        }, 2000);
      },
      (error: any) => {
        let errorMessage = 'Unable to retrieve your location.';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location permission denied. Please enable location services in your device settings.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        Alert.alert('Location Error', errorMessage);
        setIsMapAnimating(false);
        setShowSearchOverlay(true); // Show overlay again on error
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, [updateMapBounds]);

  const handleToggleListView = () => {
    setShowListView(!showListView);
  };

  const handleFilterModeChange = (mode: 'global' | 'following') => {
    setFilterMode(mode);
    // Clear existing waypoints to trigger fresh load with new filter
    setAllWaypoints(new Map());
  };

  const handleCloseWaypointDetail = (smooth: boolean = false) => {
    setFullEntryData(null); // Clear full entry data
    
    if (smooth) {
      // Smooth animated close - continue the swipe motion
      setIsClosingAnimated(true); // Prevent detail drawer from showing
      setIsExpanded(false);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight * 0.6, // Slide down beyond screen
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(drawerZIndex, {
          toValue: 1050, // Still above toggle button (1000) but lower
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(drawerHeight, {
          toValue: 0,
          duration: 250, // Slightly faster height collapse
          useNativeDriver: false,
        }),
        Animated.timing(drawerOpacity, {
          toValue: 0,
          duration: 200, // Quick fade out
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Clean up after animation - DON'T reset opacity/zIndex yet to prevent flash
        translateY.setValue(0);
        setIsDrawerVisible(false);
        
        // Immediate cleanup for faster marker switching
        setShouldRenderDrawer(false);
        setIsClosingAnimated(false);
        setSelectedWaypoint(null);
        
        // Reset animated values for next use - delay to prevent flash
        setTimeout(() => {
          drawerOpacity.setValue(1);
        }, 50);
      });
    } else {
      // Immediate close for other cases
      setIsExpanded(false);
      translateY.setValue(0);
      setIsDrawerVisible(false);
      setSelectedWaypoint(null);
      setShouldRenderDrawer(false);
      setIsClosingAnimated(false);
      Animated.spring(drawerHeight, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleExpandDetail = async () => {
    if (!selectedWaypoint?.post?.id) return;
    
    // Start loading state
    setIsLoadingExpanded(true);
    
    // Reset translateY and animate drawer to expand upward by increasing height
    translateY.setValue(0);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.9, // Expand to 90% of screen
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start(async () => {
      try {
        // Fetch full entry data
        const fullEntry = await api.posts.getPostById(selectedWaypoint.post.id);
        
        setFullEntryData(fullEntry);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      } catch (error) {
        // Fall back to preview data
        setFullEntryData(selectedWaypoint);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      }
    });
  };

  const handleCollapseDetail = () => {
    setIsExpanded(false);
    setIsLoadingExpanded(false);
    setFullEntryData(null); // Clear full entry data
    
    // Reset translateY and animate back to collapsed size
    translateY.setValue(0);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.4,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start();
  };

  // Pan responder for drawer gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Respond to vertical swipes, but be more selective when expanded
      if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
        // If expanded, only respond to downward swipes when at the top of scroll
        if (isExpanded) {
          return gestureState.dy > 0 && scrollOffsetY.current <= 0;
        }
        // If collapsed, respond to any vertical swipe
        return true;
      }
      return false;
    },
    onPanResponderGrant: () => {
      const currentValue = translateY.__getValue();
      translateY.setOffset(currentValue);
      translateY.setValue(0);
      // Store the current height when gesture starts
      if (!isExpanded) {
        const currentHeight = drawerHeight.__getValue();
        drawerHeight.setOffset(currentHeight);
        drawerHeight.setValue(0);
      }
    },
    onPanResponderMove: (_, gestureState) => {
      // When expanded, only allow downward movement
      if (isExpanded && gestureState.dy < 0) {
        return; // Don't allow upward movement when expanded
      }
      
      if (isExpanded) {
        // For expanded state, only allow downward movement with translateY
        translateY.setValue(gestureState.dy);
      } else {
        // For collapsed state, handle both directions
        if (gestureState.dy < 0) {
          // Upward swipe - animate height instead of translateY to avoid gap
          drawerHeight.setValue(Math.abs(gestureState.dy));
        } else {
          // Downward swipe - use translateY for closing motion
          translateY.setValue(gestureState.dy);
        }
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      translateY.flattenOffset();
      if (!isExpanded) {
        drawerHeight.flattenOffset();
      }

      const velocity = gestureState.vy;
      const translation = gestureState.dy;
      const currentValue = translateY.__getValue();
      
      // Determine final position based on gesture
      if (velocity > 0.5 || translation > 100) {
        // Swipe down - close completely with smooth animation
        handleCloseWaypointDetail(true);
      } else if (velocity < -0.5 || translation < -100) {
        // Swipe up - expand (only when collapsed)
        if (!isExpanded) {
          handleExpandDetail();
        }
      } else {
        // Snap back to current state
        if (isExpanded) {
          // If expanded, just reset position
          translateY.setValue(0);
        } else {
          // If collapsed, maintain collapsed state
          handleCollapseDetail();
        }
      }
    },
  });

  // Cleanup effect for search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <Screen>
        <View style={styles.unauthenticatedContainer}>
          <Text style={styles.unauthenticatedText}>
            Please log in to explore waypoints
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {/* TEMPORARY LOGOUT BUTTON */}
      <TouchableOpacity
        onPress={logout}
        style={{position: 'absolute', top: 50, right: 20, zIndex: 9999, backgroundColor: 'red', padding: 15, borderRadius: 8}}
      >
        <Text style={{color: 'white', fontWeight: 'bold'}}>LOGOUT</Text>
      </TouchableOpacity>

      {/* Always render MapView as background */}
      <MapView 
        key="map-view"
        ref={mapViewRef} 
        onWaypointPress={handleWaypointPress} 
        selectedWaypoint={selectedWaypoint}
        onRegionChange={handleMapRegionChange}
        initialCenterCoordinate={mapState.centerCoordinate}
        initialZoomLevel={mapState.zoomLevel}
        onMapStateChange={(state) => {
          setMapState({ ...state, hasInitialized: true });
        }}
        waypointsData={{ waypoints: shouldShowOverlay ? [] : Array.from(allWaypoints.values()) }}
        hideScaleBar={shouldShowOverlay}
        drawerHeightFraction={0.4}
      />

      {/* Search Overlay - Initial State */}
      {shouldShowOverlay && (
        <KeyboardAvoidingView 
          style={[styles.searchOverlay, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
            <View style={styles.searchOverlayContent}>
              {/* Heimursaga Logo */}
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/images/logo_copper_black.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Hero Text */}
              <View style={styles.heroContainer}>
                <Text 
                  style={styles.heroTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
                  Your Journey Begins Here
                </Text>
                <Text 
                  style={styles.heroSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                >
                  Geolocate, search for places, entries, or explorers
                </Text>
              </View>

              {/* Search Input */}
              <View style={styles.searchSection}>
                <View style={styles.searchInputContainer}>
                  <MagnifyingGlass size={20} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInputLarge}
                    placeholder="Search"
                    placeholderTextColor="#8E8E93"
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
                  <TouchableOpacity 
                    style={styles.locationButtonInline}
                    onPress={handleGeolocate}
                    disabled={isMapAnimating}
                  >
                    <GpsFix size={20} color="#6B7280" weight="light" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <View style={styles.searchResultsOverlay}>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item, index) => `search-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.searchResultItemLarge}
                        onPress={() => handleSearchResultSelect(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.searchResultTextLarge} numberOfLines={1}>
                          {item.place_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                    maxToRenderPerBatch={5}
                    initialNumToRender={5}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}

      {/* Compact Header - After Search */}
      {!shouldShowOverlay && (
        <View style={[styles.compactHeader, { paddingTop: insets.top }]}>
          {/* Compact Search Bar */}
          <TouchableOpacity 
            style={styles.compactSearchContainer}
            onPress={() => {
              searchInputRef.current?.focus();
            }}
          >
            <MagnifyingGlass size={20} color="#9CA3AF" style={styles.compactSearchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.compactSearchInput}
              placeholder="Search locations..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={() => {
                if (searchResults.length > 0) {
                  handleSearchResultSelect(searchResults[0]);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          {/* Filter Tabs */}
          <View style={styles.filterTabsContainer}>
            <View style={styles.filterTabsWrapper}>
              <TouchableOpacity 
                style={[styles.filterTab, styles.filterTabLeft, filterMode === 'global' && styles.filterTabActive]}
                onPress={() => handleFilterModeChange('global')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, filterMode === 'global' && styles.filterTabTextActive]}>
                  Global
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterTab, styles.filterTabRight, filterMode === 'following' && styles.filterTabActive]}
                onPress={() => handleFilterModeChange('following')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, filterMode === 'following' && styles.filterTabTextActive]}>
                  Following
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Search Results for Compact Mode - Float over map */}
      {!shouldShowOverlay && showSearchResults && searchResults.length > 0 && (
        <View style={[styles.compactSearchResults, { top: insets.top + 120 }]}>
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => `compact-search-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.compactSearchResultItem}
                onPress={() => {
                  // Dismiss keyboard first, then handle selection
                  Keyboard.dismiss();
                  handleSearchResultSelect(item);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.compactSearchResultText} numberOfLines={1}>
                  {item.place_name}
                </Text>
              </TouchableOpacity>
            )}
            maxToRenderPerBatch={5}
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* List View Overlay */}
      {showListView && (
        <View style={[styles.listViewOverlay, { paddingTop: shouldShowOverlay ? insets.top : insets.top + 160 }]}>
          <FlatList
            data={visibleWaypoints}
            renderItem={({ item }) => (
              <WaypointCard
                waypoint={item}
                onPress={() => {
                  handleWaypointPress(item, true);
                  setShowListView(false); // Close list view when item is selected
                }}
                showEngagementButtons={true}
                onBookmarkPress={() => handleBookmarkPress(item)}
              />
            )}
            keyExtractor={(item, index) => `waypoint-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {isLoading ? 'Loading waypoints...' : 'Looks like there are no journal entries visible in this area.\n\nTry zooming out or panning to see more entries!'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* List/Map Toggle Button - shown when not in search overlay */}
      {!shouldShowOverlay && (
        <TouchableOpacity 
          style={styles.listToggleButton}
          onPress={handleToggleListView}
        >
          {showListView ? (
            <MapPin size={18} color="#ffffff" weight="fill" />
          ) : (
            <List size={18} color="#ffffff" weight="bold" />
          )}
          <Text style={styles.listToggleText}>{showListView ? 'Map' : 'List'}</Text>
        </TouchableOpacity>
      )}

      {/* Waypoint Detail Drawer */}
      {shouldRenderDrawer && selectedWaypoint && (
        <Animated.View 
          style={[
            styles.waypointDetail, 
            { 
              height: drawerHeight,
              opacity: drawerOpacity,
              pointerEvents: isDrawerVisible ? 'auto' : 'none',
              transform: [{ translateY }],
              zIndex: drawerZIndex,
            }
          ]}
          {...panResponder.panHandlers}
        >
          {isLoadingExpanded ? (
            <>
              <View style={styles.dragHandle} />
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading full entry...</Text>
              </View>
            </>
          ) : isExpanded ? (
            <ExpandedWaypointView
              waypoint={{
                ...selectedWaypoint,
                post: fullEntryData || selectedWaypoint.post
              }}
              onClose={handleCloseWaypointDetail}
              onScroll={(offsetY: number) => {
                scrollOffsetY.current = offsetY;
              }}
            />
          ) : !isClosingAnimated ? (
            <>
              <View style={styles.dragHandle} />
              <WaypointCard waypoint={selectedWaypoint} showEngagementButtons={true} />
              <View style={styles.gestureHints}>
                <Text style={styles.gestureHintText}>
                  ↑ Swipe up for full view
                </Text>
              </View>
            </>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    // Note: backdropFilter not supported in React Native
  },

  searchOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: -80, // Move logo higher to match web app
    marginLeft: -20, // Offset 20px to the left
  },

  heroContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },

  heroTitle: {
    fontSize: 28, // Reduced from 32
    fontWeight: '500', // Slightly lighter weight
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 12, // Reduced from 16
    letterSpacing: -0.5, // Tighter letter spacing
  },

  heroSubtitle: {
    fontSize: 16, // Reduced from 18
    color: '#6B7280', // Match web app gray color
    textAlign: 'center',
    lineHeight: 22, // Reduced from 24
    maxWidth: 280, // Reduced from 320 for better readability
  },

  logo: {
    width: 200,
    height: 75, // Maintaining 8:3 aspect ratio (200/2.66)
  },

  searchSection: {
    width: '100%',
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 50, // More rounded like the web app
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB', // More subtle border
    minHeight: 56, // Ensure consistent height
  },

  searchIcon: {
    marginRight: 16,
  },

  searchInputLarge: {
    flex: 1,
    fontSize: 18,
    color: '#1F2937',
    paddingVertical: 0,
    fontWeight: '400',
  },

  locationButtonInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },

  searchResultsOverlay: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: 200,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchResultItemLarge: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  searchResultTextLarge: {
    fontSize: 17,
    color: '#1F2937',
    fontWeight: '400',
  },

  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },

  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  compactSearchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#8E8E93',
  },

  compactSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },

  compactSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 0, // Remove default padding
  },

  compactSearchResults: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },

  compactSearchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },

  compactSearchResultText: {
    fontSize: 16,
    color: '#1C1C1E',
  },

  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearButtonText: {
    fontSize: 12,
    color: '#8E8E93',
  },

  filterTabsContainer: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    width: 200,
  },

  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterTabLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },

  filterTabRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },

  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },

  filterTabTextActive: {
    color: '#AC6D46',
    fontWeight: '600',
  },

  listViewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
    zIndex: 999,
  },

  listContent: {
    paddingVertical: 8,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },

  listToggleButton: {
    position: 'absolute',
    bottom: 20, // Much lower - should be very close to toolbar
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AC6D46',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000, // Higher than list overlay (999)
  },

  listToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },

  waypointDetail: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1100,
    minHeight: screenHeight * 0.4,
    maxHeight: screenHeight * 0.9,
    paddingTop: 12,
  },

  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  gestureHints: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },

  gestureHintText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  unauthenticatedText: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});