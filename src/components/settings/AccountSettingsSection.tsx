import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CheckCircle, Warning } from 'phosphor-react-native';
import { useAuth } from '../../hooks';

export const AccountSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);

  // TODO: Get email verification status from user object or API
  const isEmailVerified = user?.isEmailVerified ?? false;

  const handleResendVerification = async () => {
    try {
      setIsResending(true);

      // TODO: Implement API call to resend verification email
      // await api.auth.resendEmailVerification();

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Verification Email Sent',
        'Please check your inbox for the verification email.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      Alert.alert(
        'Error',
        'Failed to send verification email. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Email Verification Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Verification</Text>

        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.emailRow}>
              <View style={styles.emailInfo}>
                <Text style={styles.emailLabel}>Email Address</Text>
                <Text style={styles.emailValue}>{user?.email || 'Not set'}</Text>

                <View style={styles.statusRow}>
                  {isEmailVerified ? (
                    <>
                      <CheckCircle size={16} color="#10B981" weight="fill" />
                      <Text style={styles.statusTextVerified}>Verified</Text>
                    </>
                  ) : (
                    <>
                      <Warning size={16} color="#F59E0B" weight="fill" />
                      <Text style={styles.statusTextUnverified}>Not verified</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {!isEmailVerified && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#AC6D46" />
                  ) : (
                    <Text style={styles.resendButtonText}>
                      Send Verification Email
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {!isEmailVerified && (
            <View style={styles.warningBanner}>
              <Warning size={16} color="#92400E" weight="fill" />
              <Text style={styles.warningText}>
                <Text style={styles.warningTextBold}>Email verification required:</Text>
                {' '}You need to verify your email address to receive notifications and updates. Check your inbox or click the button above.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user?.username || 'Not set'}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type</Text>
            <Text style={styles.infoValue}>
              {user?.role === 'creator' ? 'Creator' : 'Explorer'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    overflow: 'hidden',
  },

  cardContent: {
    padding: 16,
  },

  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  emailInfo: {
    flex: 1,
  },

  emailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },

  emailValue: {
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusTextVerified: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  statusTextUnverified: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },

  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 16,
  },

  resendButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },

  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AC6D46',
  },

  warningBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    padding: 12,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  warningTextBold: {
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    padding: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 8,
  },

  infoLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },

  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
});
