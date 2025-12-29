import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  FlatList,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MapView, MapViewRef } from '../components/map/MapView';
import { WaypointCard, ExpandedWaypointView } from '../components/map';
import { ProfileOverlay } from '../components/ProfileOverlay';
import { JourneyCard } from '../components/JourneyCard';
import { UserCard } from '../components/UserCard';
import { Avatar, SpinningBadgeLoader } from '../components/ui';
import { useProfileOverlay } from '../contexts/ProfileOverlayContext';
import { User, Gear, Calendar } from 'phosphor-react-native';
import { api } from '../api';
import { useAuth } from '../hooks';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface JournalScreenProps {
  initialView?: 'map' | 'timeline';
  username?: string; // If provided, shows this user's journal instead of current user's
}

export const JournalScreen: React.FC<JournalScreenProps> = ({ initialView = 'map', username }) => {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { showProfile } = useProfileOverlay();
  const navigation = useNavigation();
  
  // Determine if viewing another user's journal
  const isOwnJournal = !username || username === user?.username;
  const targetUsername = username || user?.username;
  const targetUser = isOwnJournal ? user : { username }; // We'll fetch full user data later if needed
  
  // Core state
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'entries' | 'journeys' | 'following' | 'followers'>('entries');
  
  // Journey mode state
  const [isJourneyMode, setIsJourneyMode] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [journeyWaypoints, setJourneyWaypoints] = useState<any[]>([]);
  
  // Drawer state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [shouldRenderDrawer, setShouldRenderDrawer] = useState(false);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const [fullEntryData, setFullEntryData] = useState<any>(null);
  
  // Profile overlay state
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  
  // Animated values
  const translateY = useRef(new Animated.Value(0)).current;
  const drawerHeight = useRef(new Animated.Value(screenHeight * 0.3)).current;
  const drawerOpacity = useRef(new Animated.Value(1)).current;
  const scrollOffsetY = useRef(0);
  const mapViewRef = useRef<MapViewRef>(null);
  const entriesScrollViewRef = useRef<ScrollView>(null);
  
  // User's journey data
  const [allUserEntries, setAllUserEntries] = useState<Map<string, any>>(new Map());
  
  // Get user's detailed profile data
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return null;
      return api.users.getUserByUsername(targetUsername);
    },
    enabled: !!targetUsername,
  });

  // Get user's waypoints from map with proper user filtering
  const { data: mapWaypoints } = useQuery({
    queryKey: ['user-waypoints', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return { waypoints: [] };
      
      // Filter by username
      const result = await api.map.queryMap({
        context: 'global' as any,
        limit: 100,
        username: targetUsername,
      });
      
      
      // Filter client-side if server filtering doesn't work
      if (result?.waypoints) {
        
        const userWaypoints = result.waypoints.filter((waypoint: any) => {
          const authorUsername = waypoint.post?.author?.username || waypoint.author?.username;
          const isUserWaypoint = authorUsername === targetUsername;
          
          return isUserWaypoint;
        });
        
        return { waypoints: userWaypoints };
      }
      
      return result;
    },
    enabled: !!targetUsername,
  });

  // Get user's posts as waypoints - always show user's own entries on map
  const { data: userPosts, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['user-posts', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return null;
      // Use getUserPostsByUsername for other users, getUserPosts for current user
      if (isOwnJournal && isAuthenticated) {
        return api.users.getUserPosts();
      } else {
        return api.users.getUserPostsByUsername(targetUsername);
      }
    },
    enabled: !!targetUsername,
  });

  // Get user's trips/journeys
  const { data: userTrips, isLoading: isLoadingJourneys } = useQuery({
    queryKey: ['user-trips', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return { data: [] };
      const result = await api.users.getUserTrips(targetUsername);
      
      // Enrich each trip with full waypoint data for accurate date calculation
      if (result?.data) {
        const enrichedTrips = await Promise.all(
          result.data.map(async (trip: any) => {
            try {
              // Fetch full trip details to get complete waypoint data
              const fullTripResponse = await api.trips.getTripById(trip.id);
              const fullTrip = fullTripResponse?.data || fullTripResponse;
              
              if (fullTrip?.waypoints) {
                // Enrich waypoints with full post data for dates
                const enrichedWaypoints = await Promise.all(
                  fullTrip.waypoints.map(async (waypoint: any) => {
                    if (waypoint.post?.id) {
                      try {
                        const fullPost = await api.posts.getPostById(waypoint.post.id);
                        const fullPostData = fullPost?.data || fullPost;
                        return { ...waypoint, post: fullPostData };
                      } catch (error) {
                        return waypoint;
                      }
                    }
                    return waypoint;
                  })
                );
                
                return {
                  ...trip,
                  waypoints: enrichedWaypoints
                };
              }
            } catch (error) {
              // Fallback to original trip data
            }
            return trip;
          })
        );
        
        return { data: enrichedTrips };
      }
      
      return result;
    },
    enabled: isAuthenticated && !!user?.username && userProfile?.creator,
  });

  // Get user's followers
  const { data: followers, isLoading: isLoadingFollowers } = useQuery({
    queryKey: ['user-followers', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return [];
      
      try {
        const response = await api.users.getFollowers(targetUsername);
        return response?.data || [];
      } catch (error) {
        console.error('Failed to fetch followers:', error);
        return [];
      }
    },
    enabled: !!targetUsername && activeTab === 'followers',
  });

  // Get user's following
  const { data: following, isLoading: isLoadingFollowing } = useQuery({
    queryKey: ['user-following', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return [];
      
      try {
        console.log('🔥 Fetching following for user:', targetUsername);
        const response = await api.users.getFollowing(targetUsername);
        console.log('🔥 Following API response:', JSON.stringify(response, null, 2));
        
        // The API returns { data: [users], results: number }
        const followingData = response?.data || [];
        console.log('🔥 Extracted following data:', followingData);
        
        return followingData;
      } catch (error) {
        console.error('Failed to fetch following:', error);
        return [];
      }
    },
    enabled: !!targetUsername && activeTab === 'following',
  });

  // Transform user posts to waypoint format
  const userWaypoints = useMemo(() => {
    if (!userPosts?.data) {
      return [];
    }
    
    const waypoints = userPosts.data.map((post: any) => {
      // Handle various coordinate field names from API
      let lat = post.lat || post.latitude;
      let lon = post.lon || post.lng || post.longitude;

      // If coordinates are still missing, try nested location data
      if (!lat && !lon && post.location) {
        lat = post.location.lat || post.location.latitude;
        lon = post.location.lon || post.location.lng || post.location.longitude;
      }

      return {
        lat: lat || 0,
        lon: lon || 0,
        date: new Date(post.date || post.createdAt),
        post: post,
      };
    }).filter((waypoint: any) => {
      const hasCoords = waypoint.lat !== 0 && waypoint.lon !== 0;
      return hasCoords;
    });
    
    return waypoints;
  }, [userPosts]);

  // Update stable collection
  useEffect(() => {
    if (userWaypoints.length > 0) {
      setAllUserEntries(prevEntries => {
        const updated = new Map(prevEntries);
        
        userWaypoints.forEach((waypoint: any) => {
          const stableKey = waypoint.post?.id || `${waypoint.lat}_${waypoint.lon}`;
          updated.set(stableKey, waypoint);
        });
        
        return updated;
      });
    } else {
    }
  }, [userWaypoints]);

  // Calculate countries visited from waypoint coordinates
  const calculateCountriesVisited = useCallback(async (waypoints: any[]) => {
    try {
      const uniqueCoordinates = new Set();
      
      waypoints.forEach((waypoint, index) => {
        if (waypoint.lat && waypoint.lon) {
          // Round coordinates to approximate country-level granularity (more generous)
          const roundedLat = Math.round(waypoint.lat / 5) * 5; // Group by 5-degree blocks
          const roundedLon = Math.round(waypoint.lon / 5) * 5;
          const coordKey = `${roundedLat},${roundedLon}`;
          
          uniqueCoordinates.add(coordKey);
        }
      });
      
      
      return uniqueCoordinates.size;
    } catch (error) {
      return 0;
    }
  }, []);

  const [calculatedCountries, setCalculatedCountries] = useState(0);
  const [calculatedTrips, setCalculatedTrips] = useState(0);

  // Calculate unique trips from waypoints
  const calculateTripsFromWaypoints = useCallback((waypoints: any[]) => {
    const uniqueTrips = new Set();
    
    waypoints.forEach((waypoint) => {
      if (waypoint.post?.trip?.id) {
        uniqueTrips.add(waypoint.post.trip.id);
      }
    });
    
    return uniqueTrips.size;
  }, []);


  // Get entries within current map bounds
  const [visibleEntries, setVisibleEntries] = useState<any[]>([]);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Journey mode functions
  const enterJourneyMode = useCallback(async (journey: any) => {
    
    // Immediately set journey state for instant visual feedback
    setSelectedJourney(journey);
    setIsJourneyMode(true);
    setActiveTab('entries'); // Switch to entries tab immediately
    
    // Start loading data in background
    let waypoints = [];
    let selectedTripData = journey;
    
    try {
      // Fetch full trip details using the trips service
      const fullTripResponse = await api.trips.getTripById(journey.id);
      const fullTrip = fullTripResponse?.data || fullTripResponse;
      
      
      // Use full trip data if available
      selectedTripData = fullTrip;
      waypoints = fullTrip.waypoints || [];
      
      // For waypoints with posts, fetch the full post data to get location information
      const enrichedWaypoints = await Promise.all(
        waypoints.map(async (waypoint: any) => {
          if (waypoint.post?.id) {
            try {
              const fullPost = await api.posts.getPostById(waypoint.post.id);
              const fullPostData = fullPost?.data || fullPost;
              
              // Replace the limited post data with full post data
              return {
                ...waypoint,
                post: fullPostData
              };
            } catch (error) {
              return waypoint; // Return original if fetch fails
            }
          }
          return waypoint; // Return as-is if no post
        })
      );
      
      waypoints = enrichedWaypoints;
      
      // Update with enriched data after loading
      setSelectedJourney(selectedTripData);
    } catch (error) {
      // Fallback to original journey data - no changes needed since we already set the basic journey data
    }
    
    // Transform waypoints to ensure consistent coordinate structure
    const transformedWaypoints = waypoints.map((waypoint: any, index: number) => {
      // Handle different coordinate formats
      let lat, lon;

      if (waypoint.post) {
        // If waypoint has a post, use post coordinates with various field name options
        lat = waypoint.post.lat || waypoint.post.latitude || waypoint.lat;
        lon = waypoint.post.lon || waypoint.post.lng || waypoint.post.longitude || waypoint.lon || waypoint.lng;

        // Try nested location data if still not found
        if (!lat && !lon && waypoint.post.location) {
          lat = waypoint.post.location.lat || waypoint.post.location.latitude;
          lon = waypoint.post.location.lon || waypoint.post.location.lng || waypoint.post.location.longitude;
        }
      } else {
        // Plain waypoint coordinates with various field name options
        lat = waypoint.lat || waypoint.latitude;
        lon = waypoint.lon || waypoint.lng || waypoint.longitude;

        // Try nested location data if still not found
        if (!lat && !lon && waypoint.location) {
          lat = waypoint.location.lat || waypoint.location.latitude;
          lon = waypoint.location.lon || waypoint.location.lng || waypoint.location.longitude;
        }
      }

      const transformed = {
        ...waypoint,
        lat: lat || 0,
        lon: lon || 0,
        // Preserve original date structure
        date: waypoint.date || waypoint.post?.date
      };
      
      return transformed;
    });
    
    const sortedWaypoints = transformedWaypoints.sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.post?.date || 0).getTime();
      const dateB = new Date(b.date || b.post?.date || 0).getTime();
      return dateA - dateB;
    });
    
    setJourneyWaypoints(sortedWaypoints);
    
    // Switch to entries tab to show the journey content
    setActiveTab('entries');
    
    // Fit map bounds to show the entire journey
    if (mapViewRef.current && sortedWaypoints.length > 0) {
      mapViewRef.current.fitJourneyBounds(sortedWaypoints);
    }
  }, []);

  const exitJourneyMode = useCallback(() => {
    
    setIsJourneyMode(false);
    setSelectedJourney(null);
    setJourneyWaypoints([]);
  }, []);

  // Track journey mode state changes
  useEffect(() => {
  }, [isJourneyMode, selectedJourney, journeyWaypoints]);

  // Auto-exit journey mode when switching to following/followers tabs (but allow journeys tab)
  useEffect(() => {
    if (isJourneyMode && activeTab !== 'entries' && activeTab !== 'journeys') {
      exitJourneyMode();
    }
  }, [activeTab, isJourneyMode, exitJourneyMode]);

  // Get entries to display - either journey-specific or map bounds filtered
  const entriesToDisplay = useMemo(() => {
    let entries: any[] = [];
    
    if (isJourneyMode && activeTab === 'entries') {
      // Show journey waypoints/entries when in journey mode
      entries = journeyWaypoints;
    } else {
      // Default: show map bounds filtered entries
      entries = visibleEntries;
    }
    
    // If an entry is selected, move it to the top of the list
    if (selectedEntry && entries.length > 0) {
      const selectedIndex = entries.findIndex((entry: any) => {
        const isEntry = !!entry.post;
        if (isEntry && selectedEntry.post) {
          return entry.post.id === selectedEntry.post.id;
        } else if (!isEntry && !selectedEntry.post) {
          return entry.id === selectedEntry.id;
        }
        return false;
      });
      
      if (selectedIndex > 0) {
        // Move selected entry to the top
        const selectedEntryData = entries[selectedIndex];
        const reorderedEntries = [selectedEntryData, ...entries.filter((_, index) => index !== selectedIndex)];
        return reorderedEntries;
      }
    }
    
    return entries;
  }, [isJourneyMode, activeTab, journeyWaypoints, visibleEntries, selectedEntry]);

  // Simple approach: show loading until we have data AND entries are processed
  const shouldShowLoading = useMemo(() => {
    // Always show loading if API is still loading
    if (isLoadingEntries) return true;

    // Show loading if we don't have user posts yet
    if (!userPosts) return true;

    // If we have user posts with data, but entriesToDisplay is empty and visibleEntries is also empty,
    // it means the entries haven't been processed through the map bounds filter yet
    if (userPosts?.data?.length > 0 && entriesToDisplay.length === 0 && visibleEntries.length === 0) {
      return true;
    }

    // Otherwise, we're ready to show content or empty state
    return false;
  }, [isLoadingEntries, userPosts, entriesToDisplay, visibleEntries]);

  // Track initial map state for reset functionality
  const [initialMapState, setInitialMapState] = useState<any>(null);
  const [hasMapInteracted, setHasMapInteracted] = useState(false);

  const updateVisibleEntries = useCallback(async () => {
    if (!mapViewRef.current) return;
    
    // Use the same waypoints that the map is displaying
    const waypointsToFilter = mapWaypoints?.waypoints || [];
    
    try {
      const bounds = await mapViewRef.current.getCurrentBounds();
      // Extract bounds coordinates - Mapbox returns {sw: {lat, lon}, ne: {lat, lon}}
      const swLat = bounds?.sw?.lat;
      const swLon = bounds?.sw?.lon;
      const neLat = bounds?.ne?.lat;
      const neLon = bounds?.ne?.lon;
      
      if (bounds && waypointsToFilter.length > 0 && swLat && swLon && neLat && neLon) {
        const filtered = waypointsToFilter.filter((waypoint: any) => {
          const lat = waypoint.lat;
          const lon = waypoint.lon;
          const isVisible = (
            lat >= swLat && lat <= neLat &&
            lon >= swLon && lon <= neLon
          );
          return isVisible;
        });
        
        setVisibleEntries(filtered);
      } else {
        setVisibleEntries(waypointsToFilter);
      }
    } catch (error) {
      setVisibleEntries(waypointsToFilter);
    }
  }, [mapWaypoints?.waypoints]);

  // Throttled version for region changes
  const throttledUpdateVisibleEntries = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      updateVisibleEntries();
    }, 300); // 300ms throttle
  }, [updateVisibleEntries]);

  // Capture initial map state
  const captureInitialMapState = useCallback(async () => {
    if (mapViewRef.current && !initialMapState) {
      try {
        const bounds = await mapViewRef.current.getCurrentBounds();
        setInitialMapState(bounds);
      } catch (error) {
        // Failed to capture initial map state
      }
    }
  }, [initialMapState]);

  // Reset map to initial state
  const handleMapReset = useCallback(() => {
    if (mapViewRef.current) {
      try {
        if (isJourneyMode && journeyWaypoints.length > 0) {
          // In journey mode: reset to journey bounds
          mapViewRef.current.fitJourneyBounds(journeyWaypoints);
        } else if (initialMapState) {
          // In normal mode: reset to initial map state
          
          // Calculate center point from bounds
          const centerLat = (initialMapState.sw.lat + initialMapState.ne.lat) / 2;
          const centerLon = (initialMapState.sw.lon + initialMapState.ne.lon) / 2;
          
          // Calculate appropriate zoom level based on bounds
          const latDelta = Math.abs(initialMapState.ne.lat - initialMapState.sw.lat);
          const lonDelta = Math.abs(initialMapState.ne.lon - initialMapState.sw.lon);
          const maxDelta = Math.max(latDelta, lonDelta);
          
          // Rough zoom level calculation (adjust as needed)
          const zoomLevel = Math.max(1, Math.min(15, 6 - Math.log2(maxDelta)));
          
          mapViewRef.current.centerOnLocation(centerLon, centerLat, zoomLevel);
        }
        
        setHasMapInteracted(false);
        setSelectedEntry(null); // Clear selection when resetting
      } catch (error) {
        // Map reset failed, but continue
      }
    }
  }, [initialMapState, isJourneyMode, journeyWaypoints]);

  // Update visible entries when map waypoints change
  useEffect(() => {
    if (mapWaypoints?.waypoints?.length > 0) {
      // Add a delay to ensure map is ready, but only call once
      const timeout = setTimeout(() => {
        updateVisibleEntries();
        // Capture initial state after map is fully loaded
        setTimeout(captureInitialMapState, 500);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [mapWaypoints?.waypoints?.length, updateVisibleEntries, captureInitialMapState]);

  // Calculate countries and trips when waypoints change
  useEffect(() => {
    const waypoints = mapWaypoints?.waypoints || [];
    
    if (waypoints.length > 0) {
      // Calculate countries
      calculateCountriesVisited(waypoints).then((count) => {
        setCalculatedCountries(count);
      });
      
      // Calculate trips
      const tripCount = calculateTripsFromWaypoints(waypoints);
      setCalculatedTrips(tripCount);
    } else {
      setCalculatedCountries(0);
      setCalculatedTrips(0);
    }
  }, [mapWaypoints, calculateCountriesVisited, calculateTripsFromWaypoints]);

  const handleEntryPress = (entry: any) => {
    // Highlight the entry in the feed when marker is clicked
    setSelectedEntry(entry);
    
    // Switch to entries tab if not already there
    const needsTabSwitch = activeTab !== 'entries';
    if (needsTabSwitch) {
      setActiveTab('entries');
    }
    
    // Reset scroll to top after a brief delay to ensure rendering is complete
    // Use longer delay if we need to switch tabs
    setTimeout(() => {
      if (entriesScrollViewRef.current) {
        entriesScrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }, needsTabSwitch ? 200 : 100);
  };

  const handleEntryCardPress = (entry: any) => {
    const isEntry = !!entry.post;
    
    if (isEntry) {
      // Entry logic (existing)
      const isAlreadySelected = selectedEntry?.post?.id === entry.post?.id;
      
      if (isAlreadySelected) {
        // Second tap on entry: Open expanded view
        setShouldRenderDrawer(true);
        setIsDrawerVisible(true);
        setIsLoadingExpanded(true);
        setFullEntryData(null);
        
        // Go straight to expanded height and load full data
        drawerHeight.setValue(screenHeight * 0.9);
        translateY.setValue(0);
        
        // Load full entry data
        setTimeout(async () => {
          try {
            const fullEntry = await api.posts.getPostById(entry.post.id);
            setFullEntryData(fullEntry);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          } catch (error) {
            setFullEntryData(entry);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          }
        }, 100);
      } else {
        // First tap on entry: Highlight card and center marker on map
        setSelectedEntry(entry);
        setHasMapInteracted(true);
        
        // Center the map on this entry's coordinates
        if (mapViewRef.current && entry.lat && entry.lon) {
          mapViewRef.current.centerOnLocation(entry.lon, entry.lat, 10); // zoom level 10
        }
      }
    } else {
      // Waypoint logic (new)
      const isWaypointSelected = selectedEntry?.id === entry.id && !selectedEntry?.post;
      
      if (isWaypointSelected) {
        // Second tap on waypoint: Do nothing (no expanded view for waypoints)
        return;
      } else {
        // First tap on waypoint: Highlight card and center marker on map
        setSelectedEntry(entry);
        setHasMapInteracted(true);
        
        
        // Center the map on this waypoint's coordinates
        if (mapViewRef.current && entry.lat && entry.lon) {
          mapViewRef.current.centerOnLocation(entry.lon, entry.lat, 10); // zoom level 10
        }
      }
    }
  };

  const handleCloseEntryDetail = (smooth: boolean = false) => {
    setFullEntryData(null);
    
    if (smooth) {
      setIsExpanded(false);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight * 0.5,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(drawerHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(drawerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => {
        translateY.setValue(0);
        setIsDrawerVisible(false);
        setShouldRenderDrawer(false);
        setSelectedEntry(null);
        setTimeout(() => {
          drawerOpacity.setValue(1);
        }, 50);
      });
    } else {
      setIsExpanded(false);
      translateY.setValue(0);
      setIsDrawerVisible(false);
      setSelectedEntry(null);
      setShouldRenderDrawer(false);
      Animated.spring(drawerHeight, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleExpandDetail = async () => {
    if (!selectedEntry?.post?.id) return;
    
    setIsLoadingExpanded(true);
    
    translateY.setValue(0);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.9,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start(async () => {
      try {
        const fullEntry = await api.posts.getPostById(selectedEntry.post.id);
        setFullEntryData(fullEntry);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      } catch (error) {
        setFullEntryData(selectedEntry);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      }
    });
  };

  const handleCollapseDetail = () => {
    setIsExpanded(false);
    setIsLoadingExpanded(false);
    setFullEntryData(null);
    
    translateY.setValue(0);
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.3,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start();
  };

  const handleTabChange = (tab: 'entries' | 'journeys' | 'following' | 'followers') => {
    setActiveTab(tab);
  };

  const handleProfileUpdate = async (updatedProfile: any) => {
    try {
      // Update profile via API - using existing method for now
      // await api.users.updateProfile(updatedProfile);
      // You might want to invalidate and refetch user data here
    } catch (error) {
      // Profile update failed
    }
  };

  // Pan responder for drawer gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
        if (isExpanded) {
          return gestureState.dy > 0 && scrollOffsetY.current <= 0;
        }
        return true;
      }
      return false;
    },
    onPanResponderGrant: () => {
      translateY.setOffset((translateY as any)._value);
      translateY.setValue(0);
      if (!isExpanded) {
        drawerHeight.setOffset((drawerHeight as any)._value);
        drawerHeight.setValue(0);
      }
    },
    onPanResponderMove: (_, gestureState) => {
      if (isExpanded && gestureState.dy < 0) {
        return;
      }
      
      if (isExpanded) {
        translateY.setValue(gestureState.dy);
      } else {
        if (gestureState.dy < 0) {
          drawerHeight.setValue(Math.abs(gestureState.dy));
        } else {
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
      
      if (velocity > 0.5 || translation > 100) {
        handleCloseEntryDetail(true);
      } else if (velocity < -0.5 || translation < -100) {
        if (!isExpanded) {
          handleExpandDetail();
        }
      } else {
        if (isExpanded) {
          translateY.setValue(0);
        } else {
          handleCollapseDetail();
        }
      }
    },
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.unauthenticatedContainer}>
        <Text style={styles.unauthenticatedText}>
          Please log in to view your journal
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Section - 70% of screen */}
      <View style={styles.mapSection}>
        <MapView
          key="journal-map-view"
          ref={mapViewRef}
          onWaypointPress={handleEntryPress}
          selectedWaypoint={selectedEntry}
          waypointsData={useMemo(() => ({ 
            waypoints: isJourneyMode ? [] : (mapWaypoints?.waypoints || []) 
          }), [isJourneyMode, mapWaypoints?.waypoints])}
          hideScaleBar={true}
          onRegionChange={throttledUpdateVisibleEntries}
          selectedJourney={isJourneyMode ? selectedJourney : null}
          journeyWaypoints={useMemo(() => 
            isJourneyMode ? journeyWaypoints : [], 
            [isJourneyMode, journeyWaypoints]
          )}
        />


        {/* Centered Profile Button */}
        <Avatar
          user={{
            username: targetUsername || 'Unknown',
            picture: isOwnJournal ? user?.picture : userProfile?.picture,
            creator: isOwnJournal ? (user?.role === 'creator') : userProfile?.creator,
          }}
          size="large"
          style={{
            ...styles.profileButton,
            top: insets.top + 16,
          }}
          onPress={() => {
            if (targetUsername) {
              // Pass just the username so the context fetches complete profile data
              showProfile(targetUsername);
            }
          }}
        />
        
        {/* Username Badge */}
        {!isOwnJournal && (
          <View style={[styles.usernameBadge, { top: insets.top + 16 + 64 + 8 }]}>
            <Text style={styles.usernameText}>{targetUsername}</Text>
          </View>
        )}

        {/* Back Button - Top Left (for other users' journals) */}
        {!isOwnJournal && (
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 16 }]}
            onPress={() => {
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}

        {/* Reset Button - Top Right */}
        {hasMapInteracted && initialMapState && (
          <TouchableOpacity 
            style={[styles.resetButton, { top: insets.top + 16 }]}
            onPress={handleMapReset}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>↺</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabbed Section - 20% of screen */}
      <View style={styles.tabbedSection}>
        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <View style={styles.filterTabsWrapper}>
            {[
              { key: 'entries', label: 'Entries' },
              ...(userProfile?.creator ? [{ key: 'journeys', label: 'Journeys' }] : []),
              // Hide following and followers tabs when in journey mode or viewing other users
              ...(!isJourneyMode && isOwnJournal ? [
                { key: 'following', label: 'Following' },
                { key: 'followers', label: 'Followers' },
              ] : []),
            ].map((filter, index, array) => (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.7}
                style={[
                  styles.filterTab,
                  filter.key === 'entries' && styles.filterTabFirst,
                  index === array.length - 1 && styles.filterTabLast, // Dynamic last tab
                  activeTab === filter.key && styles.filterTabActive,
                ]}
                onPress={() => handleTabChange(filter.key as any)}
              >
                <Text 
                  style={[
                    styles.filterTabText,
                    activeTab === filter.key && styles.filterTabTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'entries' && (
            <View style={styles.entriesTabContent}>
              {shouldShowLoading ? (
                <View style={styles.loadingContainer}>
                  <SpinningBadgeLoader size={48} />
                </View>
              ) : entriesToDisplay.length > 0 ? (
                <ScrollView 
                  ref={entriesScrollViewRef}
                  style={styles.entriesFeed} 
                  contentContainerStyle={styles.entriesFeedContent}
                  showsVerticalScrollIndicator={false}
                >
                  {entriesToDisplay.map((entry: any, index: number) => {
                    // Determine if this is an entry (has post) or just a waypoint
                    const isEntry = !!entry.post;
                    const title = isEntry ? entry.post.title : (entry.title || `Waypoint ${index + 1}`);
                    const date = isEntry ? entry.post.date : entry.date;
                    
                    const place = isEntry 
                      ? (entry.post.place || entry.post.location || entry.post.address || entry.post.city || entry.place || entry.location || entry.address || entry.city)
                      : null; // Waypoints will show "WAYPOINT" instead of location
                    
                    
                    // Check if this entry/waypoint is selected
                    const isSelected = isEntry 
                      ? selectedEntry?.post?.id === entry.post?.id 
                      : selectedEntry?.id === entry.id && !selectedEntry?.post;
                    
                    return (
                      <TouchableOpacity 
                        key={entry.post?.id || entry.id || index}
                        activeOpacity={0.7}
                        style={[
                          styles.entryCard,
                          !isEntry && styles.waypointCard, // Different style for waypoints
                          isSelected && styles.entryCardSelected
                        ]}
                        onPress={() => handleEntryCardPress(entry)}
                      >
                        <View style={styles.entryCardHeader}>
                          <Text style={[styles.entryTitle, !isEntry && styles.waypointTitle]} numberOfLines={1}>
                            {title}
                          </Text>
                          <Text style={styles.entryDate}>
                            {date ? new Date(date).toLocaleDateString() : 'No date'}
                          </Text>
                        </View>
                        
                        <View style={styles.entryCardFooter}>
                          <Text style={styles.entryCoordinates}>
                            {`${entry.lat?.toFixed(4) || '0.0000'}, ${entry.lon?.toFixed(4) || '0.0000'}`}
                          </Text>
                          {isEntry ? (
                            <Text style={styles.entryPlace} numberOfLines={1}>
                              {place || 'Unknown location'}
                            </Text>
                          ) : (
                            <View style={styles.waypointBadgeLocation}>
                              <Text style={styles.waypointBadgeLocationText}>WAYPOINT</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : !shouldShowLoading && entriesToDisplay.length === 0 ? (
                <View style={styles.emptyState}>
                  {entriesToDisplay.length === 0 && !isJourneyMode && mapWaypoints?.waypoints?.length > 0 && (
                    <Text style={styles.entriesHint}>
                      Pan the map to see entries in different areas
                    </Text>
                  )}

                  {entriesToDisplay.length === 0 && isJourneyMode && (
                    <Text style={styles.entriesHint}>
                      This journey has no waypoints or entries
                    </Text>
                  )}

                  {entriesToDisplay.length === 0 && !isJourneyMode && mapWaypoints?.waypoints?.length === 0 && (
                    <Text style={styles.entriesHint}>
                      No entries found
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          )}
          {activeTab === 'journeys' && userProfile?.creator && (
            <View style={styles.journeysTabContent}>
              {isLoadingJourneys ? (
                <View style={styles.loadingContainer}>
                  <SpinningBadgeLoader size={48} />
                </View>
              ) : userTrips?.data && userTrips.data.length > 0 ? (
                <ScrollView 
                  style={styles.journeysFeed} 
                  contentContainerStyle={styles.journeysFeedContent}
                  showsVerticalScrollIndicator={false}
                >
                  {userTrips.data.map((journey: any, index: number) => (
                    <JourneyCard
                      key={journey.id || index}
                      id={journey.id}
                      title={journey.title}
                      startDate={journey.startDate}
                      endDate={journey.endDate}
                      waypoints={journey.waypoints || []}
                      selected={isJourneyMode && selectedJourney?.id === journey.id}
                      onPress={(journeyId) => {
                        const journey = userTrips.data.find((j: any) => j.id === journeyId);
                        if (journey) {
                          enterJourneyMode(journey);
                        } else {
                        }
                      }}
                    />
                  ))}
                </ScrollView>
              ) : !isLoadingJourneys && userTrips !== undefined ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No journeys created yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create your first journey to see it here
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          {activeTab === 'following' && (
            <View style={styles.socialTabContent}>
              {isLoadingFollowing ? (
                <View style={styles.loadingContainer}>
                  <SpinningBadgeLoader size={48} />
                </View>
              ) : following && following.length > 0 ? (
                <ScrollView 
                  style={styles.socialList}
                  contentContainerStyle={styles.socialListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {following.map((followedUser: any, index: number) => (
                    <UserCard
                      key={followedUser.username || index}
                      user={{
                        username: followedUser.username,
                        picture: followedUser.picture,
                        creator: followedUser.creator,
                        bio: followedUser.bio, // May be undefined, that's OK
                      }}
                    />
                  ))}
                </ScrollView>
              ) : !isLoadingFollowing && following !== undefined ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {isOwnJournal ? "You're not following anyone yet" : `${targetUsername} isn't following anyone yet`}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          {activeTab === 'followers' && (
            <View style={styles.socialTabContent}>
              {isLoadingFollowers ? (
                <View style={styles.loadingContainer}>
                  <SpinningBadgeLoader size={48} />
                </View>
              ) : followers && followers.length > 0 ? (
                <ScrollView 
                  style={styles.socialList}
                  contentContainerStyle={styles.socialListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {followers.map((follower: any, index: number) => (
                    <UserCard
                      key={follower.id || follower.username || index}
                      user={{
                        id: follower.id,
                        username: follower.username,
                        picture: follower.picture,
                        creator: follower.creator,
                        bio: follower.bio,
                        followed: follower.followed,
                      }}
                    />
                  ))}
                </ScrollView>
              ) : !isLoadingFollowers && followers !== undefined ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {isOwnJournal ? "You don't have any followers yet" : `${targetUsername} doesn't have any followers yet`}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* Entry Detail Drawer */}
      {shouldRenderDrawer && selectedEntry && (
        <Animated.View
          style={[
            styles.entryDetail,
            {
              height: drawerHeight,
              opacity: drawerOpacity,
              pointerEvents: isDrawerVisible ? 'auto' : 'none',
              transform: [{ translateY }],
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
                ...selectedEntry,
                post: fullEntryData || selectedEntry.post
              }}
              onClose={handleCloseEntryDetail}
              onScroll={(offsetY: number) => {
                scrollOffsetY.current = offsetY;
              }}
            />
          ) : (
            <>
              <View style={styles.dragHandle} />
              <WaypointCard waypoint={selectedEntry} showEngagementButtons={true} />
              <View style={styles.gestureHints}>
                <Text style={styles.gestureHintText}>
                  ↑ Swipe up for full view
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      )}

      {/* Journey Banner Overlay */}
      {isJourneyMode && activeTab === 'entries' && (
        <View style={styles.journeyBannerOverlay}>
          <Text style={styles.journeyBannerTitle} numberOfLines={1}>
            {selectedJourney.title}
          </Text>
          <TouchableOpacity 
            style={styles.journeyBannerClose}
            activeOpacity={0.7}
            onPress={exitJourneyMode}
          >
            <Text style={styles.journeyBannerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Overlay */}
      <ProfileOverlay
        visible={showProfileOverlay}
        user={{
          id: user?.id || userProfile?.id || '',
          username: user?.username || 'Unknown',
          picture: user?.picture || userProfile?.picture,
          bio: userProfile?.bio,
          locationFrom: userProfile?.locationFrom,
          locationLives: userProfile?.locationLives,
          joinedDate: userProfile?.createdAt ? new Date(userProfile.createdAt) : new Date(),
          creator: user?.role === 'creator' || userProfile?.creator,
          portfolio: userProfile?.portfolio,
          stats: {
            totalEntries: mapWaypoints?.waypoints?.length || 0,
            favoriteLocations: user?.favoriteLocations || [],
            journeysCount: calculatedTrips,
            countriesVisited: calculatedCountries,
          },
        }}
        onClose={() => setShowProfileOverlay(false)}
        onUpdateProfile={handleProfileUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  mapSection: {
    flex: 0.7, // 70% of screen height
    position: 'relative',
  },

  tabbedSection: {
    flex: 0.3, // 30% of screen height
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  profileButton: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -32, // Half of width to center (64/2 for large Avatar)
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  resetButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  resetButtonText: {
    color: '#AC6D46',
    fontSize: 20,
    fontWeight: '600',
  },

  filterTabsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },

  filterTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    width: screenWidth - 32,
  },

  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterTabFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },

  filterTabLast: {
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
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
  },

  filterTabTextActive: {
    color: '#AC6D46',
    fontWeight: '600',
  },

  entryCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },

  journeyBannerOverlay: {
    position: 'absolute',
    bottom: screenHeight * 0.3 - 28, // Position to touch tabs (subtract paddingTop 16 + paddingBottom 12)
    left: 0,
    right: 0,
    backgroundColor: '#AC6D46',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },

  journeyBannerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },

  journeyBannerClose: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  journeyBannerCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#F9FAFB',
  },

  entriesTabContent: {
    flex: 1,
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  journeysTabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  journeysFeed: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  journeysFeedContent: {
    paddingBottom: 8,
  },

  tabHeader: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },

  entriesFeed: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  entriesFeedContent: {
    paddingBottom: 8,
  },

  entryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  entryCardSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#AC6D46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#AC6D46',
  },

  waypointCard: {
    backgroundColor: '#ffffff',
    shadowColor: '#8E8E93',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  waypointTitle: {
    color: '#666666',
  },

  waypointIndicator: {
    fontSize: 12,
  },

  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  entryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },

  entryDate: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  entryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  entryCoordinates: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    fontFamily: 'Menlo',
  },

  entryPlace: {
    flex: 1,
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
    marginLeft: 8,
  },

  entriesHint: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    opacity: 0.8,
  },

  entryDetail: {
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
    minHeight: screenHeight * 0.3,
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

  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },

  // WAYPOINT badge in location area
  waypointBadgeLocation: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },

  waypointBadgeLocationText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Username badge below avatar
  usernameBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#AC6D46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  usernameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Back button for user journals
  backButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#AC6D46',
  },

  // Social tabs (followers/following) styles
  socialTabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  socialList: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  socialListContent: {
    paddingBottom: 8,
  },

});