import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Avatar, EngagementButton } from '../ui';
import { useEngagement, useShare } from '../../hooks';

interface WaypointCardProps {
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
    };
    waypoint?: {
      id: number;
      title: string;
      date: Date;
    };
  };
  onPress?: () => void;
  onBookmarkPress?: () => void;
  showEngagementButtons?: boolean;
}

export const WaypointCard: React.FC<WaypointCardProps> = ({
  waypoint,
  onPress,
  onBookmarkPress: _onBookmarkPress,
  showEngagementButtons = false,
}) => {
  const { shareEntry } = useShare();

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <Avatar
              user={{
                username: waypoint.post?.author.username || 'Anonymous',
                picture: waypoint.post?.author.picture,
                creator: waypoint.post?.author.creator,
              }}
              size="medium"
              style={styles.avatar}
            />
            <View style={styles.authorDetails}>
              <Text style={styles.username}>
                {waypoint.post?.author.username || 'Anonymous'}
                {waypoint.post?.author.creator && (
                  <Text style={styles.creatorBadge}> ✓</Text>
                )}
              </Text>
              <Text style={styles.date}>
                {formatDate(waypoint.post?.date || waypoint.post?.createdAt || waypoint.date)}
              </Text>
            </View>
          </View>
          
        </View>

        {/* Content */}
        {waypoint.post ? (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {waypoint.post.title}
            </Text>
            {waypoint.post.content && (
              <Text style={styles.contentText} numberOfLines={3}>
                {waypoint.post.content}
              </Text>
            )}
            {waypoint.post.trip && (
              <View style={styles.tripInfo}>
                <Text style={styles.tripLabel}>Part of journey:</Text>
                <Text style={styles.tripTitle}>{waypoint.post.trip.title}</Text>
              </View>
            )}
          </>
        ) : waypoint.waypoint ? (
          <Text style={styles.title} numberOfLines={2}>
            {waypoint.waypoint.title || 'Waypoint'}
          </Text>
        ) : (
          <Text style={styles.title}>Unknown Location</Text>
        )}

        {/* Location */}
        <View style={styles.location}>
          <Text style={styles.locationText} numberOfLines={1} adjustsFontSizeToFit>
            {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}
            {waypoint.post?.place && ` | ${waypoint.post.place}`}
          </Text>
        </View>

        {/* Engagement Buttons */}
        {showEngagementButtons && waypoint.post && engagement && (
          <View style={styles.engagementRow}>
            <EngagementButton
              type="like"
              active={engagement.state.liked}
              count={engagement.state.likesCount}
              disabled={engagement.loading.like}
              onPress={engagement.handleLike}
              size="small"
              showCount={false}
            />
            <EngagementButton
              type="bookmark"
              active={engagement.state.bookmarked}
              count={engagement.state.bookmarksCount}
              disabled={engagement.loading.bookmark}
              onPress={engagement.handleBookmark}
              size="small"
              showCount={false}
            />
            <EngagementButton
              type="share"
              onPress={handleShare}
              size="small"
              showCount={false}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  content: {
    padding: 16,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  avatar: {
    marginRight: 12,
  },
  
  authorDetails: {
    flex: 1,
  },
  
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  
  creatorBadge: {
    color: '#4676AC',
    fontSize: 14,
  },
  
  date: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  
  bookmarkButton: {
    padding: 8,
  },
  
  bookmarkIcon: {
    fontSize: 20,
  },
  
  bookmarkedIcon: {
    opacity: 1,
  },
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    lineHeight: 24,
  },
  
  contentText: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 12,
  },
  
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  tripLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 4,
  },
  
  tripTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#AC6D46',
    flex: 1,
  },
  
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  
  locationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  
  locationText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Menlo', // Monospace font for coordinates
  },

  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
});