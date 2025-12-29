import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { api } from '../api';

interface EngagementState {
  liked: boolean;
  likesCount: number;
  bookmarked: boolean;
  bookmarksCount: number;
}

interface UseEngagementProps {
  postId: string;
  initialState: EngagementState;
}

export const useEngagement = ({ postId, initialState }: UseEngagementProps) => {
  const [state, setState] = useState<EngagementState>(initialState);
  const [loading, setLoading] = useState({
    like: false,
    bookmark: false,
  });

  const handleLike = useCallback(async () => {
    if (loading.like) return;

    const wasLiked = state.liked;
    const oldCount = state.likesCount;

    // Optimistic update
    setState(prev => ({
      ...prev,
      liked: !prev.liked,
      likesCount: prev.liked ? prev.likesCount - 1 : prev.likesCount + 1,
    }));

    setLoading(prev => ({ ...prev, like: true }));

    try {
      const response = await api.posts.likePost(postId);

      // Update with server response
      setState(prev => ({
        ...prev,
        likesCount: response.likesCount || prev.likesCount,
      }));
    } catch (error) {
      // Rollback on failure
      setState(prev => ({
        ...prev,
        liked: wasLiked,
        likesCount: oldCount,
      }));

      Alert.alert(
        'Error',
        'Failed to update highlight. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  }, [postId]);

  const handleBookmark = useCallback(async () => {
    if (loading.bookmark) return;

    const wasBookmarked = state.bookmarked;
    const oldCount = state.bookmarksCount;

    // Optimistic update
    setState(prev => ({
      ...prev,
      bookmarked: !prev.bookmarked,
      bookmarksCount: prev.bookmarked ? prev.bookmarksCount - 1 : prev.bookmarksCount + 1,
    }));

    setLoading(prev => ({ ...prev, bookmark: true }));

    try {
      const response = await api.posts.bookmarkPost(postId);

      // Update with server response
      setState(prev => ({
        ...prev,
        bookmarksCount: response.bookmarksCount || prev.bookmarksCount,
      }));
    } catch (error) {
      // Rollback on failure
      setState(prev => ({
        ...prev,
        bookmarked: wasBookmarked,
        bookmarksCount: oldCount,
      }));

      Alert.alert(
        'Error',
        'Failed to update bookmark. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(prev => ({ ...prev, bookmark: false }));
    }
  }, [postId]);

  return {
    state,
    loading,
    handleLike,
    handleBookmark,
  };
};