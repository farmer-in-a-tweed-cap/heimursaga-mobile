import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EngagementButton } from '../ui';
import { useEngagement, useShare } from '../../hooks';
import { CommentList, CommentListHandle } from '../comments';
import { CommentInput } from '../comments/CommentInput';
import { api } from '../../api';

interface ExpandedWaypointViewProps {
  waypoint: {
    lat: number;
    lon: number;
    date: Date;
    post?: {
      id: string;
      title: string;
      content: string;
      date?: Date;
      createdAt?: Date;
      place?: string;
      bookmarked: boolean;
      liked?: boolean;
      likesCount?: number;
      bookmarksCount?: number;
      author: {
        username: string;
        picture: string;
        creator?: boolean;
      };
      trip?: {
        id: string;
        title: string;
      };
      media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        caption?: string;
        thumbnail?: string;
      }>;
    };
    waypoint?: {
      id: number;
      title: string;
      date: Date;
    };
  };
  onClose: () => void;
  onScroll?: (offsetY: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const ExpandedWaypointView: React.FC<ExpandedWaypointViewProps> = ({
  waypoint,
  onClose,
  onScroll,
}) => {
  const insets = useSafeAreaInsets();
  const { shareEntry } = useShare();
  const [commentReplyTo, setCommentReplyTo] = React.useState<any>(null);
  const commentListRef = useRef<CommentListHandle>(null);

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Initialize engagement state for posts
  const engagement = waypoint.post ? useEngagement({
    postId: waypoint.post.id,
    initialState: {
      liked: waypoint.post.liked || false,
      likesCount: waypoint.post.likesCount || 0,
      bookmarked: waypoint.post.bookmarked || false,
      bookmarksCount: waypoint.post.bookmarksCount || 0,
    },
  }) : null;


  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = () => {
    if (waypoint.post) {
      shareEntry({
        postId: waypoint.post.id,
        title: waypoint.post.title,
        author: waypoint.post.author.username,
      });
    }
  };

  // Smooth close animation
  const handleSmoothClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: Dimensions.get('window').height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Entrance animation
  useEffect(() => {
    translateY.setValue(Dimensions.get('window').height);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const scrollOffsetY = useRef(0);

  // Pan responder for swipe down to close gesture
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Respond to downward swipes when at the top of scroll
      return Math.abs(gestureState.dy) > 10 &&
             Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
             gestureState.dy > 0 &&
             scrollOffsetY.current <= 0;
    },
    onPanResponderGrant: () => {
      translateY.setOffset((translateY as any)._value);
      translateY.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow downward movement and update translateY
      if (gestureState.dy >= 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      translateY.flattenOffset();
      const velocity = gestureState.vy;
      const translation = gestureState.dy;

      // Close if user swiped down significantly or with good velocity
      if (velocity > 0.5 || translation > 100) {
        handleSmoothClose();
      } else {
        // Snap back to original position
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });


  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 20,
          transform: [{ translateY }],
          opacity
        }
      ]}
      {...panResponder.panHandlers}
    >
      {/* Drag Handle */}
      <View style={styles.dragHandle} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollOffsetY.current = event.nativeEvent.contentOffset.y;
          if (onScroll) {
            onScroll(event.nativeEvent.contentOffset.y);
          }
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Title */}
        {waypoint.post ? (
          <Text style={styles.titleLarge}>
            {waypoint.post.title}
          </Text>
        ) : waypoint.waypoint ? (
          <Text style={styles.titleLarge}>
            {waypoint.waypoint.title || 'Waypoint'}
          </Text>
        ) : (
          <Text style={styles.titleLarge}>Unknown Location</Text>
        )}

        {/* Centered metadata */}
        <View style={styles.metadataSection}>
          {/* Date */}
          <Text style={styles.metadataText}>
            {formatDate(waypoint.date)}
          </Text>
          
          {/* Coordinates */}
          <Text style={styles.metadataPrimary}>
            {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}
          </Text>
          
          {/* Place */}
          {waypoint.post?.place && (
            <Text style={styles.metadataPrimary}>
              {waypoint.post.place}
            </Text>
          )}
          
          {/* Journey */}
          {waypoint.post?.trip && (
            <Text style={styles.metadataText}>
              Part of journey: <Text style={styles.metadataPrimary}>{waypoint.post.trip.title}</Text>
            </Text>
          )}
          
          {/* Author */}
          {waypoint.post && (
            <Text style={styles.metadataText}>
              by <Text style={styles.usernameBold}>{waypoint.post.author.username || 'Anonymous'}</Text>
              {waypoint.post.author.creator && (
                <Text style={styles.creatorBadgeLarge}> ✓</Text>
              )}
            </Text>
          )}
        </View>

        {/* Content */}
        {waypoint.post?.content && (
          <Text style={styles.contentTextLarge}>
            {waypoint.post.content.replace(/\\n/g, '\n')}
          </Text>
        )}

        {/* Media - After content like web app */}
        {(() => {
          if (waypoint.post?.media && waypoint.post.media.length > 0) {
            waypoint.post.media.forEach((media, index) => {
            });
          }
          return waypoint.post?.media && waypoint.post.media.length > 0;
        })() && (
          <View style={styles.mediaSection}>
            {waypoint.post?.media?.map((media, index) => (
              <View key={media.id || index} style={styles.mediaItem}>
                {media.thumbnail ? (
                  <Image
                    source={{ uri: media.thumbnail }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    onError={(error) => {
                    }}
                    onLoad={() => {
                    }}
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>📷 No Image</Text>
                  </View>
                )}
                {media.caption && (
                  <Text style={styles.mediaCaption}>{media.caption}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Engagement Buttons */}
        {waypoint.post && engagement && (
          <View style={styles.engagementRow}>
            <EngagementButton
              type="like"
              active={engagement.state.liked}
              count={engagement.state.likesCount}
              disabled={engagement.loading.like}
              onPress={engagement.handleLike}
              size="medium"
              showCount={false}
            />
            <EngagementButton
              type="bookmark"
              active={engagement.state.bookmarked}
              count={engagement.state.bookmarksCount}
              disabled={engagement.loading.bookmark}
              onPress={engagement.handleBookmark}
              size="medium"
              showCount={false}
            />
            <EngagementButton
              type="share"
              onPress={handleShare}
              size="medium"
              showCount={false}
            />
          </View>
        )}

        {/* Comments Section */}
        {waypoint.post && (
          <View style={styles.commentsSection}>
            <CommentList
              ref={commentListRef}
              postId={waypoint.post.id}
              commentsEnabled={waypoint.post.commentsEnabled ?? true}
              renderCommentInput={true}
              onReplyChange={setCommentReplyTo}
            />
          </View>
        )}

        {/* Logged annotation - centered at bottom */}
        <View style={styles.loggedSection}>
          <Text style={styles.loggedText}>
            entry logged on {formatDate(waypoint.post?.createdAt || waypoint.post?.date || waypoint.date)} by {waypoint.post?.author?.username || 'Anonymous'}
          </Text>
        </View>
      </ScrollView>

      {/* Comment Input - Fixed at bottom with keyboard avoidance */}
      {waypoint.post && (waypoint.post.commentsEnabled ?? true) && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
        >
          <CommentInput
            onSubmit={async (content) => {
              await commentListRef.current?.createComment(content, commentReplyTo?.id);
            }}
            replyToUsername={commentReplyTo?.author.username}
            onCancelReply={() => commentListRef.current?.clearReply()}
          />
        </KeyboardAvoidingView>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
  },

  bookmarkButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookmarkIcon: {
    fontSize: 24,
  },

  bookmarkedIcon: {
    opacity: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  avatarImageLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4676AC',
  },

  authorInfo: {
    flex: 1,
  },

  usernameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },

  creatorBadgeLarge: {
    color: '#4676AC',
    fontSize: 18,
  },

  dateLarge: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },

  tripSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tripLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },

  tripTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4676AC',
    flex: 1,
  },

  titleLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 36,
    marginBottom: 24,
    marginTop: 16,
    textAlign: 'center',
  },

  metadataSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  metadataText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },

  usernameBold: {
    fontWeight: '600',
    color: '#1C1C1E',
  },

  metadataPrimary: {
    fontSize: 16,
    color: '#AC6D46',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },

  mediaSection: {
    marginBottom: 24,
  },

  mediaItem: {
    marginBottom: 16,
  },

  mediaImage: {
    width: screenWidth - 40,
    height: (screenWidth - 40) * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },

  videoPlaceholder: {
    width: screenWidth - 40,
    height: (screenWidth - 40) * 0.75,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoText: {
    fontSize: 18,
    color: '#8E8E93',
  },

  mediaCaption: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginTop: 8,
    fontStyle: 'italic',
  },

  contentTextLarge: {
    fontSize: 18,
    color: '#1C1C1E',
    lineHeight: 26,
    marginBottom: 32,
  },

  locationSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  locationHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },

  locationCoordinates: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Menlo', // Monospace font for coordinates
  },

  placeLarge: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },

  loggedSection: {
    paddingTop: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  loggedText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 16,
  },

  commentsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});