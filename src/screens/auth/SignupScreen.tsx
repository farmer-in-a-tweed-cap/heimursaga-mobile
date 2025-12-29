import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Keyboard,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Screen, Input, Button } from '../../components/ui';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useAuth } from '../../hooks';
import { validation, validateField, validationRules } from '../../utils/validation';
import { Colors } from '../../theme/colors';
import type { ISignupPayload } from '../../types';

interface SignupFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface SignupScreenProps {
  navigation: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signup, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchPassword = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    try {
      Keyboard.dismiss();
      clearError();
      
      // Validate password confirmation
      if (data.password !== data.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      // Sanitize inputs
      const sanitizedData: ISignupPayload = {
        email: validation.sanitizeInput(data.email.trim().toLowerCase()),
        username: validation.sanitizeInput(data.username.trim().toLowerCase()),
        password: data.password, // Don't sanitize password
      };

      await signup(sanitizedData);
      
      // Navigation will be handled by the app's auth state change
      Alert.alert(
        'Account Created',
        'Your account has been created successfully! Please check your email for verification.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      // Error is handled by the auth store and displayed via error state
    }
  };

  const handleSignIn = () => {
    Keyboard.dismiss();
    navigation.navigate('Login');
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/heimursaga_badge.png')}
            style={styles.badge}
            resizeMode="contain"
          />
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Become an explorer</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            rules={{
              validate: (value) => validateField(value, validationRules.signupEmail),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            )}
          />

          <Controller
            control={control}
            name="username"
            rules={{
              validate: (value) => validateField(value, validationRules.signupUsername),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.username?.message}
                placeholder="Choose a unique username"
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              validate: (value) => validateField(value, validationRules.signupPassword),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                placeholder="Create a strong password"
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
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              validate: (value) => {
                if (!value) return 'Please confirm your password';
                if (value !== watchPassword) return 'Passwords do not match';
                return true;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                placeholder="Confirm your password"
                secureTextEntry
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                rightIcon={
                  showConfirmPassword ? (
                    <EyeSlash size={20} color="#8E8E93" weight="light" />
                  ) : (
                    <Eye size={20} color="#8E8E93" weight="light" />
                  )
                }
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.signupButton}
          />

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
  
  signupButton: {
    marginBottom: 16,
    marginTop: 8,
  },
  
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  
  termsText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loginText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  
  loginLink: {
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