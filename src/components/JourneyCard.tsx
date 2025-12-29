import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Calendar, MapPin } from 'phosphor-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface JourneyCardProps {
  id: string;
  title: string;
  startDate?: string | Date;
  endDate?: string | Date;
  waypoints?: any[];
  onPress?: (journeyId: string) => void;
  selected?: boolean;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({
  id,
  title,
  startDate,
  endDate,
  waypoints = [],
  onPress,
  selected = false,
}) => {
  // Calculate date range from waypoints/entries instead of journey start/end dates
  const calculateDateRangeFromWaypoints = () => {
    if (waypoints.length === 0) return 'No dates available';
    
    // Extract all dates from waypoints - try multiple date field variations
    const dates: Date[] = [];
    waypoints.forEach(waypoint => {
      if (waypoint.date) {
        dates.push(new Date(waypoint.date));
      }
      if (waypoint.post?.date) {
        dates.push(new Date(waypoint.post.date));
      }
      if (waypoint.createdAt) {
        dates.push(new Date(waypoint.createdAt));
      }
      if (waypoint.post?.createdAt) {
        dates.push(new Date(waypoint.post.createdAt));
      }
      // Also try common timestamp field
      if (waypoint.timestamp) {
        dates.push(new Date(waypoint.timestamp));
      }
    });
    
    if (dates.length === 0) return 'No dates available';
    
    // Sort dates to get min and max
    dates.sort((a, b) => a.getTime() - b.getTime());
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };
    
    // If same date or very close, show single date
    if (minDate.getTime() === maxDate.getTime() || dates.length === 1) {
      return formatDate(minDate);
    }
    
    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress(id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.journeyCard,
        selected && styles.journeyCardSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.journeyCardHeader}>
        <Text style={styles.journeyTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      
      <View style={styles.journeyCardFooter}>
        <Text style={styles.journeyDate}>
          {calculateDateRangeFromWaypoints()}
        </Text>
        <Text style={styles.journeyWaypoints}>
          {waypoints.length} {waypoints.length === 1 ? 'stop' : 'stops'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  journeyCard: {
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

  journeyCardSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#AC6D46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#AC6D46',
  },

  journeyCardHeader: {
    padding: 16,
    paddingBottom: 12,
  },

  journeyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  journeyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  journeyDate: {
    fontSize: 12,
    color: '#AC6D46',
    fontWeight: '500',
  },

  journeyWaypoints: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
});