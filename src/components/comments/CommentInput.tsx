import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  replyToUsername?: string;
  onCancelReply?: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Add a comment...',
  maxLength = 5000,
  replyToUsername,
  onCancelReply,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(content.trim());
      setContent('');
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = content.trim().length > 0 && content.length <= maxLength;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'position' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {replyToUsername && (
          <View style={styles.replyHeader}>
            <Text style={styles.replyText}>
              Replying to @{replyToUsername}
            </Text>
            <TouchableOpacity onPress={onCancelReply}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={maxLength}
            editable={!isSubmitting}
            scrollEnabled={false}
          />
          <View style={styles.footer}>
            <Text style={styles.charCount}>
              {content.length}/{maxLength}
            </Text>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValid || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  replyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cancelText: {
    fontSize: 13,
    color: '#AC6D46',
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    fontSize: 14,
    color: '#1F2937',
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitButton: {
    backgroundColor: '#AC6D46',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
