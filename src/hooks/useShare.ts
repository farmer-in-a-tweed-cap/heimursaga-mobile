import { useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';

// Safely import react-native-share with fallback
let Share: any = null;
try {
  Share = require('react-native-share').default;
} catch (error) {
  console.warn('react-native-share not available, using fallback sharing methods');
}

interface ShareEntryProps {
  postId: string;
  title: string;
  author?: string;
}

// Fallback sharing methods when react-native-share is not available
const fallbackShare = async (url: string, message: string, title: string) => {
  try {
    // Platform-specific share implementations

    // For iOS, we'll use a simple approach with URL schemes
    if (Platform.OS === 'ios') {
      // Try WhatsApp first, then fallback to SMS, then email
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${message} ${url}`)}`;
      const smsUrl = `sms:&body=${encodeURIComponent(`${message} ${url}`)}`;
      const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message} ${url}`)}`;

      try {
        const canOpenWhatsApp = await Linking.canOpenURL('whatsapp://');
        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
          return;
        }
      } catch (e) {
        // WhatsApp not available
      }

      // Show alert with sharing options
      Alert.alert(
        'Share Journal Entry',
        'Choose how you would like to share this entry:',
        [
          {
            text: 'SMS',
            onPress: () => Linking.openURL(smsUrl).catch(() => {
              Alert.alert('Error', 'Unable to open SMS app');
            }),
          },
          {
            text: 'Email',
            onPress: () => Linking.openURL(emailUrl).catch(() => {
              Alert.alert('Error', 'Unable to open email app');
            }),
          },
          {
            text: 'Copy Link',
            onPress: () => {
              // Note: We can't copy to clipboard without react-native-clipboard
              Alert.alert('Share Link', `Copy this link to share: ${url}`, [
                { text: 'OK' }
              ]);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // For Android, show alert with sharing options (similar to iOS)
      Alert.alert(
        'Share Journal Entry',
        'Choose how you would like to share this entry:',
        [
          {
            text: 'WhatsApp',
            onPress: async () => {
              const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${message} ${url}`)}`;
              try {
                const canOpen = await Linking.canOpenURL(whatsappUrl);
                if (canOpen) {
                  await Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert('Error', 'WhatsApp is not installed');
                }
              } catch (e) {
                Alert.alert('Error', 'Unable to open WhatsApp');
              }
            },
          },
          {
            text: 'Email',
            onPress: () => {
              const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message} ${url}`)}`;
              Linking.openURL(emailUrl).catch(() => {
                Alert.alert('Error', 'Unable to open email app');
              });
            },
          },
          {
            text: 'Copy Link',
            onPress: () => {
              Alert.alert('Share Link', `Copy this link to share: ${url}`, [
                { text: 'OK' }
              ]);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  } catch (error) {
    Alert.alert('Share Link', `Copy this link to share: ${url}`, [
      { text: 'OK' }
    ]);
  }
};

export const useShare = () => {
  const shareEntry = useCallback(async ({ postId, title, author }: ShareEntryProps) => {
    try {
      // Lazy load environment config to avoid module initialization issues
      const { ENV } = await import('../config/environment');

      // Construct the web URL for sharing
      const webBaseUrl = ENV.APP_ENV === 'production'
        ? 'https://heimursaga.com' // Replace with actual production URL
        : 'http://localhost:3000'; // Development web app URL

      const url = `${webBaseUrl}/entries/${postId}`;

      const authorText = author ? ` by ${author}` : '';
      const message = `Check out this journal entry${authorText}: ${title}`;

      // Check if react-native-share is available
      if (Share && Share.open) {
        const options = {
          title: 'Share Journal Entry',
          message: message,
          url: url,
          subject: `Journal Entry: ${title}`, // For email sharing
          // Add app-specific options
          social: Share.Social?.WHATSAPP,
          whatsAppNumber: '', // Optional WhatsApp number
          filename: `journal-entry-${postId}`, // For file-based sharing
        };

        await Share.open(options);
      } else {
        // Use fallback sharing method
        await fallbackShare(url, message, `Journal Entry: ${title}`);
      }
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error?.message && error.message.indexOf('User did not share') === -1) {
        // If react-native-share is not available, try fallback
        if (!Share || !Share.open) {
          try {
            const { ENV } = await import('../config/environment');
            const webBaseUrl = ENV.APP_ENV === 'production'
              ? 'https://heimursaga.com'
              : 'http://localhost:3000';
            const url = `${webBaseUrl}/entries/${postId}`;
            const authorText = author ? ` by ${author}` : '';
            const message = `Check out this journal entry${authorText}: ${title}`;

            await fallbackShare(url, message, `Journal Entry: ${title}`);
          } catch (fallbackError) {
            Alert.alert(
              'Share Failed',
              'Unable to share this journal entry. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Share Failed',
            'Unable to share this journal entry. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
      // If user cancelled, do nothing (no error message needed)
    }
  }, []);

  const shareToSpecificPlatform = useCallback(async (
    { postId, title, author }: ShareEntryProps,
    platform: 'whatsapp' | 'instagram' | 'twitter' | 'email'
  ) => {
    try {
      // Lazy load environment config to avoid module initialization issues
      const { ENV } = await import('../config/environment');

      const webBaseUrl = ENV.APP_ENV === 'production'
        ? 'https://heimursaga.com'
        : 'http://localhost:3000';

      const url = `${webBaseUrl}/entries/${postId}`;
      const authorText = author ? ` by ${author}` : '';
      const message = `Check out this journal entry${authorText}: ${title}`;

      // Check if react-native-share is available
      if (Share && Share.shareSingle && Share.Social) {
        let shareOptions: any = {
          title: 'Share Journal Entry',
          message: message,
          url: url,
        };

        switch (platform) {
          case 'whatsapp':
            shareOptions.social = Share.Social.WHATSAPP;
            break;
          case 'instagram':
            shareOptions.social = Share.Social.INSTAGRAM;
            break;
          case 'twitter':
            shareOptions.social = Share.Social.TWITTER;
            shareOptions.message = `${message} ${url}`; // Twitter includes URL in message
            break;
          case 'email':
            shareOptions.social = Share.Social.EMAIL;
            shareOptions.subject = `Journal Entry: ${title}`;
            break;
        }

        await Share.shareSingle(shareOptions);
      } else {
        // Use fallback for specific platforms
        const fallbackUrls: Record<string, string> = {
          whatsapp: `whatsapp://send?text=${encodeURIComponent(`${message} ${url}`)}`,
          email: `mailto:?subject=${encodeURIComponent(`Journal Entry: ${title}`)}&body=${encodeURIComponent(`${message} ${url}`)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${message} ${url}`)}`,
          instagram: '', // Instagram doesn't support URL sharing
        };

        const fallbackUrl = fallbackUrls[platform];

        if (platform === 'instagram') {
          Alert.alert(
            'Instagram Sharing',
            'Instagram sharing requires the native share module. Please use the general share option instead.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (fallbackUrl) {
          const canOpen = await Linking.canOpenURL(fallbackUrl);
          if (canOpen) {
            await Linking.openURL(fallbackUrl);
          } else {
            throw new Error(`Cannot open ${platform}`);
          }
        } else {
          throw new Error(`Platform ${platform} not supported in fallback mode`);
        }
      }
    } catch (error: any) {
      if (error?.message && error.message.indexOf('User did not share') === -1) {
        Alert.alert(
          'Share Failed',
          `Unable to share to ${platform}. Please make sure the app is installed.`,
          [{ text: 'OK' }]
        );
      }
    }
  }, []);

  return {
    shareEntry,
    shareToSpecificPlatform,
  };
};