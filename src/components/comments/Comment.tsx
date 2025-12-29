import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ICommentDetail } from '../../types';
import { Avatar } from '../ui/Avatar';
import { api } from '../../api';

interface CommentProps {
  comment: ICommentDetail;
  onReply?: (comment: ICommentDetail) => void;
  onDelete?: (commentId: string, parentId?: string) => void;
  onUpdate?: () => void;
  depth?: number;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onReply,
  onDelete,
  onUpdate,
  depth = 0,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await api.comments.deleteComment(comment.id);
              onDelete?.(comment.id, comment.parentId);
            } catch (error) {
              console.error('Failed to delete comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      await api.comments.updateComment(comment.id, {
        content: editedContent.trim(),
      });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const commentDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString();
  };

  const isEdited = new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

  return (
    <View style={[styles.container, depth > 0 && styles.replyContainer]}>
      <Avatar user={comment.author} size="small" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>
            {comment.author.username}
            {comment.author.creator && <Text style={styles.creatorBadge}> ✦</Text>}
          </Text>
          <Text style={styles.timestamp}>
            {formatDate(comment.createdAt)}
            {isEdited && <Text style={styles.edited}> (edited)</Text>}
          </Text>
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editedContent}
              onChangeText={setEditedContent}
              multiline
              autoFocus
              maxLength={5000}
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={isSaving || !editedContent.trim()}
                style={[
                  styles.saveButton,
                  (isSaving || !editedContent.trim()) && styles.saveButtonDisabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.text}>{comment.content}</Text>

            <View style={styles.actions}>
              {depth === 0 && onReply && (
                <TouchableOpacity onPress={() => onReply(comment)}>
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
              )}
              {comment.createdByMe && (
                <>
                  <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isDeleting}
                    style={styles.actionButton}
                  >
                    <Text style={[styles.actionText, styles.deleteText]}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.replies}>
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  replyContainer: {
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  creatorBadge: {
    color: '#AC6D46',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  edited: {
    fontStyle: 'italic',
  },
  text: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    marginLeft: 0,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  replies: {
    marginTop: 8,
  },
  editContainer: {
    marginTop: 4,
  },
  editInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 80,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#AC6D46',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
