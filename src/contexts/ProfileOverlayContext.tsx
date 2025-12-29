import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { Alert } from 'react-native';
import { ProfileOverlay } from '../components/ProfileOverlay';
import { api } from '../api';
import { useAuth } from '../hooks';

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

interface ProfileOverlayContextType {
  showProfile: (userIdentifier: string | User) => void;
  hideProfile: () => void;
  setOnViewJournal: (callback: (username: string) => void) => void;
}

const ProfileOverlayContext = createContext<ProfileOverlayContextType | undefined>(undefined);

interface ProfileOverlayProviderProps {
  children: ReactNode;
}

export const ProfileOverlayProvider: React.FC<ProfileOverlayProviderProps> = ({ children }) => {
  const { user: currentAuthUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const onViewJournalCallbackRef = useRef<((username: string) => void) | null>(null);


  const showProfile = async (userIdentifier: string | User) => {
    setIsLoading(true);
    setIsVisible(true);

    try {
      let userData: User;

      if (typeof userIdentifier === 'string') {
        // If it's a username string, fetch the user data
        const response = await api.users.getUserByUsername(userIdentifier);
        
        // Also fetch the user's posts to calculate stats
        let userStats = {
          totalEntries: 0,
          favoriteLocations: [],
          journeysCount: 0,
          countriesVisited: 0,
        };

        try {
          // Fetch user's waypoints to calculate stats
          const userWaypointsResponse = await api.map.queryMap({
            context: 'global' as any,
            limit: 1000, // Get more entries to calculate accurate stats
            username: userIdentifier,
          });

          if (userWaypointsResponse?.waypoints) {
            const waypoints = userWaypointsResponse.waypoints.filter((wp: any) => {
              const authorUsername = wp.post?.author?.username || wp.author?.username;
              return authorUsername === userIdentifier;
            });

            userStats.totalEntries = waypoints.length;

            // Calculate countries visited from coordinates
            const uniqueCoordinates = new Set();
            waypoints.forEach((waypoint: any) => {
              if (waypoint.lat && waypoint.lon) {
                const roundedLat = Math.round(waypoint.lat / 5) * 5;
                const roundedLon = Math.round(waypoint.lon / 5) * 5;
                const coordKey = `${roundedLat},${roundedLon}`;
                uniqueCoordinates.add(coordKey);
              }
            });
            userStats.countriesVisited = uniqueCoordinates.size;

            // Calculate unique trips
            const uniqueTrips = new Set();
            waypoints.forEach((waypoint: any) => {
              if (waypoint.post?.trip?.id) {
                uniqueTrips.add(waypoint.post.trip.id);
              }
            });
            userStats.journeysCount = uniqueTrips.size;
          }
        } catch (error) {
          // If stats fetching fails, keep default zeros
        }

        userData = {
          id: response.id || response.data?.id || userIdentifier,
          username: response.username || response.data?.username || userIdentifier,
          picture: response.picture || response.data?.picture,
          bio: response.bio || response.data?.bio,
          locationFrom: response.locationFrom || response.data?.locationFrom,
          locationLives: response.locationLives || response.data?.locationLives,
          joinedDate: response.createdAt ? new Date(response.createdAt) : (response.data?.createdAt ? new Date(response.data.createdAt) : undefined),
          creator: response.creator || response.data?.creator || response.role === 'creator',
          portfolio: response.portfolio || response.data?.portfolio,
          followed: response.followed || response.data?.followed || false,
          stats: userStats,
        };
      } else {
        // If it's already a user object, use it directly
        userData = userIdentifier;
      }

      setCurrentUser(userData);
    } catch (error) {
      // If API call fails, show error and create a minimal user object
      console.error('Failed to load user profile:', error);
      const fallbackUsername = typeof userIdentifier === 'string' ? userIdentifier : userIdentifier.username;

      // Show error to user
      if (__DEV__) {
        Alert.alert('Error', `Failed to load profile for ${fallbackUsername}`);
      }

      setCurrentUser({
        id: fallbackUsername,
        username: fallbackUsername,
        stats: {
          totalEntries: 0,
          favoriteLocations: [],
          journeysCount: 0,
          countriesVisited: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hideProfile = () => {
    setIsVisible(false);
    setCurrentUser(null);
  };

  const setOnViewJournal = (callback: (username: string) => void) => {
    onViewJournalCallbackRef.current = callback;
  };

  return (
    <ProfileOverlayContext.Provider value={{ showProfile, hideProfile, setOnViewJournal }}>
      {children}
      {isVisible && (currentUser || isLoading) && (
        <ProfileOverlay
          visible={isVisible}
          user={currentUser}
          isLoading={isLoading}
          isOwnProfile={
            !!currentUser && (
              currentAuthUser?.username === currentUser.username ||
              currentAuthUser?.id === currentUser.id ||
              currentAuthUser?.username?.toLowerCase().trim() === currentUser.username?.toLowerCase().trim()
            )
          }
          onClose={hideProfile}
          onUpdateProfile={(updatedData) => {
            if (currentUser) {
              setCurrentUser({
                ...currentUser,
                ...updatedData,
              });
            }
          }}
          onViewJournal={onViewJournalCallbackRef.current || undefined}
        />
      )}
    </ProfileOverlayContext.Provider>
  );
};

export const useProfileOverlay = () => {
  const context = useContext(ProfileOverlayContext);
  if (!context) {
    throw new Error('useProfileOverlay must be used within a ProfileOverlayProvider');
  }
  return context;
};