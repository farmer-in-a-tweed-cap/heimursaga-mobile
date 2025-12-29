import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, SpinningBadgeLoader } from '../components/ui';
import { WaypointCard, ExpandedWaypointView } from '../components/map';
import { api } from '../api';
import { useAuth } from '../hooks';

export const BookmarksScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedWaypoint, setSelectedWaypoint] = useState<any>(null);
  const [showExpandedView, setShowExpandedView] = useState(false);

  // Get user's bookmarked posts
  const { data: bookmarks, isLoading, refetch } = useQuery({
    queryKey: ['user-bookmarks'],
    queryFn: async () => {
      const response = await api.users.getUserBookmarks();
      return response?.data || [];
    },
    enabled: isAuthenticated,
  });

  // Bookmark/unbookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      return api.posts.bookmarkPost(postId);
    },
    onSuccess: () => {
      // Refresh bookmarks data
      queryClient.invalidateQueries({ queryKey: ['user-bookmarks'] });
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update bookmark');
    },
  });

  // Transform bookmarks to waypoint format for WaypointCard
  const waypointData = React.useMemo(() => {
    if (!bookmarks) return [];

    return bookmarks.map((post: any, index: number) => {
      // Handle various coordinate field names from API
      let lat = post.lat || post.latitude;
      let lon = post.lon || post.lng || post.longitude;

      // Check for null values and try waypoint data (which is where coordinates actually are)
      if ((!lat || lat === null) && (!lon || lon === null) && post.waypoint) {
        lat = post.waypoint.lat || post.waypoint.latitude;
        lon = post.waypoint.lon || post.waypoint.lng || post.waypoint.longitude;
      }

      // If coordinates are still missing, try nested location data
      if ((!lat || lat === null) && (!lon || lon === null) && post.location) {
        lat = post.location.lat || post.location.latitude;
        lon = post.location.lon || post.location.lng || post.location.longitude;
      }

      // Try nested coordinates object
      if ((!lat || lat === null) && (!lon || lon === null) && post.coordinates) {
        lat = post.coordinates.lat || post.coordinates.latitude;
        lon = post.coordinates.lon || post.coordinates.lng || post.coordinates.longitude;
      }

      return {
        lat: lat || 0,
        lon: lon || 0,
        date: new Date(post.date || post.createdAt),
        post: {
          ...post,
          bookmarked: true, // All items in bookmarks are bookmarked
        },
      };
    });
  }, [bookmarks]);

  const handleWaypointPress = useCallback(async (waypoint: any) => {
    setSelectedWaypoint(waypoint);
    setShowExpandedView(true);

    // Fetch full entry data to get media and complete information
    if (waypoint.post?.id) {
      try {
        const fullEntry = await api.posts.getPostById(waypoint.post.id);
        setSelectedWaypoint({
          ...waypoint,
          post: fullEntry,
        });
      } catch (error) {
        // Use existing data if fetch fails
        console.warn('Failed to fetch full entry data:', error);
      }
    }
  }, []);

  const handleBookmarkPress = useCallback((waypoint: any) => {
    if (!waypoint.post?.id) return;
    bookmarkMutation.mutate(waypoint.post.id);
  }, [bookmarkMutation]);

  const handleCloseExpandedView = useCallback(() => {
    setShowExpandedView(false);
    setSelectedWaypoint(null);
  }, []);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderWaypointCard = ({ item }: { item: any }) => (
    <WaypointCard
      waypoint={item}
      onPress={() => handleWaypointPress(item)}
      onBookmarkPress={() => handleBookmarkPress(item)}
      showEngagementButtons={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
      <Text style={styles.emptySubtitle}>
        Bookmark journal entries while exploring to save them here for later reading.
      </Text>
    </View>
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          {waypointData.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {waypointData.length} entries
            </Text>
          )}
        </View>

        {/* Bookmarks List */}
        <View style={styles.listContainer}>
          {isLoading && !bookmarks ? (
            <View style={styles.loadingContainer}>
              <SpinningBadgeLoader size={64} />
            </View>
          ) : (
            <FlatList
              data={waypointData}
              renderItem={renderWaypointCard}
              keyExtractor={(item, index) => item.post?.id || `bookmark-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading && !!bookmarks}
                  onRefresh={onRefresh}
                  tintColor="#AC6D46"
                  colors={['#AC6D46']}
                />
              }
            />
          )}
        </View>

        {/* Expanded View Modal */}
        {showExpandedView && selectedWaypoint && (
          <View style={styles.expandedViewContainer}>
            <ExpandedWaypointView
              waypoint={selectedWaypoint}
              onClose={handleCloseExpandedView}
            />
          </View>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },

  listContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  listContent: {
    paddingVertical: 8,
    paddingBottom: 100, // Account for bottom tab bar
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  expandedViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
    zIndex: 1000,
  },
});