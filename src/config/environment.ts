import Config from 'react-native-config';

export interface EnvironmentConfig {
  MAPBOX_ACCESS_TOKEN: string;
  API_BASE_URL: string;
  APP_ENV: 'development' | 'staging' | 'production';
}

// Validate required environment variables
const validateConfig = (): EnvironmentConfig => {
  const requiredVars = ['MAPBOX_ACCESS_TOKEN', 'API_BASE_URL', 'APP_ENV'];
  const missing = requiredVars.filter(key => !Config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    MAPBOX_ACCESS_TOKEN: Config.MAPBOX_ACCESS_TOKEN!,
    API_BASE_URL: Config.API_BASE_URL!,
    APP_ENV: (Config.APP_ENV as 'development' | 'staging' | 'production') || 'development',
  };
};

// Get environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  try {
    return validateConfig();
  } catch (error) {
    // No fallbacks for security - require proper environment configuration
    console.error('Environment configuration error:', error);
    throw new Error(
      'Environment variables are required. Please check your .env file and ensure all required variables are set. ' +
      'See .env.example for reference.'
    );
  }
};

export const ENV = getEnvironmentConfig();