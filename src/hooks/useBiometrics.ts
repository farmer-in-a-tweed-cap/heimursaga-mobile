import { useState, useEffect } from 'react';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { secureStorage, STORAGE_KEYS } from '../utils/storage';
import { debug } from '../utils/debug';

const rnBiometrics = new ReactNativeBiometrics();

export interface BiometricsCapabilities {
  available: boolean;
  biometryType?: keyof typeof BiometryTypes;
  error?: string;
}

export const useBiometrics = () => {
  const [capabilities, setCapabilities] = useState<BiometricsCapabilities>({
    available: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      setIsLoading(true);
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      setCapabilities({
        available,
        biometryType,
      });
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({
        available: false,
        error: 'Failed to check biometric capabilities',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBiometrics = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      if (!capabilities.available) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate with biometrics to log in',
        cancelButtonText: 'Cancel',
      });

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: error || 'Biometric authentication failed',
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  };

  const isBiometricLoginEnabled = async (): Promise<boolean> => {
    try {
      const enabled = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      debug.log('Retrieved biometric login setting from storage:', enabled);
      const result = enabled === 'true';
      debug.log('Biometric login enabled result:', result);
      return result;
    } catch (error) {
      console.error('Error checking biometric login setting:', error);
      return false;
    }
  };

  const setBiometricLoginEnabled = async (enabled: boolean): Promise<void> => {
    try {
      debug.log('Setting biometric login enabled to:', enabled);
      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
      debug.log('Successfully saved biometric login preference to secure storage');
    } catch (error) {
      console.error('Error setting biometric login preference:', error);
    }
  };

  const getBiometricIconName = (): string => {
    switch (capabilities.biometryType) {
      case BiometryTypes.FaceID:
        return 'face-id';
      case BiometryTypes.TouchID:
        return 'fingerprint';
      case BiometryTypes.Biometrics:
        return 'fingerprint';
      default:
        return 'fingerprint';
    }
  };

  const getBiometricDisplayName = (): string => {
    switch (capabilities.biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.Biometrics:
        return 'Biometric';
      default:
        return 'Biometric';
    }
  };

  return {
    capabilities,
    isLoading,
    authenticateWithBiometrics,
    isBiometricLoginEnabled,
    setBiometricLoginEnabled,
    getBiometricIconName,
    getBiometricDisplayName,
    checkBiometricCapabilities,
  };
};