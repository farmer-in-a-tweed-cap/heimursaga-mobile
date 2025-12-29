import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ICommentDetail } from '../../types';
import { api } from '../../api';
import { Comment } from './Comment';
import { CommentInput } from './CommentInput';

interface CommentListProps {
  postId: string;
  commentsEnabled?: boolean;
  onCommentInputFocus?: () => void;
  renderCommentInput?: boolean;
  onReplyChange?: (comment: ICommentDetail | null) => void;
}

export interface CommentListHandle {
  createComment: (content: string, parentId?: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearReply: () => void;
}

export const CommentList = forwardRef<CommentListHandle, CommentListProps>(({
  postId,
  commentsEnabled = true,
  renderCommentInput,
  onCommentInputFocus,
  onReplyChange,
}, ref) => {
  const [comments, setComments] = useState<ICommentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [replyTo, setReplyTo] = useState<ICommentDetail | null>(null);

  const fetchComments = useCallback(async (cursor?: string, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await api.comments.getCommentsByPost(postId, {
        limit: 20,
        cursor,
      });

      if (refresh || !cursor) {
        setComments(response.data);
      } else {
        setComments((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleRefresh = () => {
    fetchComments(undefined, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && nextCursor) {
      fetchComments(nextCursor);
    }
  };

  const handleReplyChange = (comment: ICommentDetail | null) => {
    setReplyTo(comment);
    onReplyChange?.(comment);
  };

  const handleCreateComment = async (content: string, parentId?: string) => {
    const newComment = await api.comments.createComment(postId, {
      content,
      parentId: parentId || replyTo?.id,
    });

    if (parentId || replyTo) {
      const targetParentId = parentId || replyTo?.id;
      // Update the parent comment with the new reply
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === targetParentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
              repliesCount: (comment.repliesCount || 0) + 1,
            };
          }
          return comment;
        })
      );
    } else {
      // Add new top-level comment
      setComments((prev) => [newComment, ...prev]);
    }

    handleReplyChange(null);
  };

  // Expose functions to parent components via ref
  useImperativeHandle(ref, () => ({
    createComment: handleCreateComment,
    refresh: () => fetchComments(undefined, true),
    clearReply: () => handleReplyChange(null),
  }));

  const handleDeleteComment = (commentId: string, parentId?: string) => {
    if (parentId) {
      // Delete reply
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies?.filter((r) => r.id !== commentId),
              repliesCount: Math.max((comment.repliesCount || 0) - 1, 0),
            };
          }
          return comment;
        })
      );
    } else {
      // Delete top-level comment
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#AC6D46" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listContent}>
        {comments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {commentsEnabled ? 'No comments yet. Be the first to comment!' : 'Comments are disabled for this post.'}
            </Text>
          </View>
        ) : (
          <>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={handleReplyChange}
                onDelete={handleDeleteComment}
                onUpdate={() => fetchComments(undefined, true)}
              />
            ))}
            {isLoadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#AC6D46" />
              </View>
            )}
            {hasMore && !isLoadingMore && (
              <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
                <Text style={styles.loadMoreText}>Load more comments</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      {!renderCommentInput && commentsEnabled && (
        <CommentInput
          onSubmit={(content) => handleCreateComment(content)}
          replyToUsername={replyTo?.author.username}
          onCancelReply={() => handleReplyChange(null)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#AC6D46',
    fontWeight: '600',
  },
});
