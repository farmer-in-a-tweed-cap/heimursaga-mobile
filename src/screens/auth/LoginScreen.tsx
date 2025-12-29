import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '../../components/ui';
import { Eye, EyeSlash, Fingerprint } from 'phosphor-react-native';
import { useAuth, useBiometrics } from '../../hooks';
import { validation, validateField, validationRules } from '../../utils/validation';
import { Colors } from '../../theme/colors';
import { secureStorage, STORAGE_KEYS } from '../../utils/storage';
import type { ILoginPayload, LoginScreenNavigationProp } from '../../types';

interface LoginFormData {
  login: string;
  password: string;
}

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, loginWithBiometrics, isLoading, error, clearError } = useAuth();
  const { 
    capabilities, 
    authenticateWithBiometrics, 
    isBiometricLoginEnabled, 
    setBiometricLoginEnabled,
    getBiometricDisplayName 
  } = useBiometrics();
  const [showPassword, setShowPassword] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hasAttemptedBiometric, setHasAttemptedBiometric] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    mode: 'onSubmit',
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const attemptBiometricLogin = async () => {
    if (hasAttemptedBiometric || isLoading) {
      return;
    }
    
    setHasAttemptedBiometric(true);
    
    try {
      clearError();
      const result = await authenticateWithBiometrics();
      
      if (result.success) {
        // Now actually log in with stored credentials
        await loginWithBiometrics();
      } else {
        // User cancelled or failed, just continue to normal login
      }
    } catch (err) {
      // Don't show error for automatic biometric login, just continue to normal login
    }
  };

  useEffect(() => {
    const checkBiometricSetting = async () => {
      
      const enabled = await isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
      
      // If biometric login is enabled and we have stored refresh token,
      // offer biometric login option (but don't auto-trigger)
      if (enabled && capabilities.available && !hasAttemptedBiometric) {
        try {
          const biometricRefreshToken = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN);
          if (biometricRefreshToken) {
            setHasStoredCredentials(true);
            // Clean up any legacy credential storage
            const legacyCredentials = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
            if (legacyCredentials) {
              await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
            }
          } else {
            setHasStoredCredentials(false);
          }
        } catch (error) {
          setHasStoredCredentials(false);
        }
      }
    };
    
    if (capabilities.available !== undefined) {
      checkBiometricSetting();
    }
  }, [capabilities.available, hasAttemptedBiometric]);

  const handleBiometricLogin = async () => {
    try {
      clearError();
      const result = await authenticateWithBiometrics();
      
      if (result.success) {
        // Now actually log in with stored credentials
        await loginWithBiometrics();
      } else {
        Alert.alert('Authentication Failed', result.error || 'Biometric authentication failed');
      }
    } catch (err) {
      // Error will be shown via the auth store error state
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      Keyboard.dismiss();
      clearError();
      
      // Sanitize inputs
      const sanitizedData: ILoginPayload = {
        login: validation.sanitizeInput(data.login.trim()),
        password: data.password, // Don't sanitize password
      };

      await login(sanitizedData);
      
      // After successful login, check if we need to set up biometric login
      if (capabilities.available) {
        // Check if biometric is enabled and properly configured
        const biometricRefreshToken = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN);
        const legacyCredentials = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
        
        if (!biometricEnabled) {
          // First time setup
          Alert.alert(
            'Enable Biometric Login',
            `Would you like to use ${getBiometricDisplayName()} for faster login next time?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: async () => {
                  try {
                    // Store a refresh token specifically for biometric auth
                    const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                    if (refreshToken) {
                      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN, refreshToken);
                      await setBiometricLoginEnabled(true);
                      setBiometricEnabled(true);

                      // Clean up old insecure credential storage
                      await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
                    } else {
                      Alert.alert('Error', 'Unable to set up biometric login. Please try again.');
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to enable biometric login.');
                  }
                }
              }
            ]
          );
        } else {
          // Check if we need to update from old credential-based to token-based system
          if (!biometricRefreshToken) {
            Alert.alert(
              'Update Biometric Login',
              `${getBiometricDisplayName()} needs to be updated for enhanced security. Set it up again?`,
              [
                { text: 'Not Now', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: async () => {
                    try {
                      // Migrate to token-based system
                      const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                      if (refreshToken) {
                        await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN, refreshToken);

                        // Clean up old insecure credential storage
                        await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
                      } else {
                        Alert.alert('Error', 'Unable to update biometric login. Please try again.');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update biometric login.');
                    }
                  }
                }
              ]
            );
          }
        }
      }
      
      // Navigation will be handled by the app's auth state change
    } catch (err) {
      // Error is handled by the auth store and displayed via error state
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    Keyboard.dismiss();
    navigation.navigate('Signup');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        bounces={false}
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/heimursaga_badge.png')}
            style={styles.badge}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back, Explorer</Text>
          <Text style={styles.subtitle}>Log in to continue your journey</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="login"
            rules={{
              validate: (value) => validateField(value, validationRules.login),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email or Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.login?.message}
                placeholder="Enter your email or username"
                keyboardType="visible-password"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              validate: (value) => validateField(value, validationRules.loginPassword),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                placeholder="Enter your password"
                secureTextEntry
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                rightIcon={
                  showPassword ? (
                    <EyeSlash size={20} color="#8E8E93" weight="light" />
                  ) : (
                    <Eye size={20} color="#8E8E93" weight="light" />
                  )
                }
                autoComplete="password"
                textContentType="password"
              />
            )}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            {capabilities.available && biometricEnabled && hasStoredCredentials && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
              >
                <Fingerprint size={24} color={Colors.secondary} weight="light" />
                <Text style={styles.biometricText}>{getBiometricDisplayName()}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title="Log In"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.loginButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  badge: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  
  form: {
    width: '100%',
  },
  
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  forgotPasswordButton: {
    flex: 1,
  },
  
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  
  biometricText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500',
  },
  
  loginButton: {
    marginBottom: 24,
  },
  
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  signupText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  
  signupLink: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
  },
  
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  
  passwordToggle: {
    fontSize: 16,
  },
});