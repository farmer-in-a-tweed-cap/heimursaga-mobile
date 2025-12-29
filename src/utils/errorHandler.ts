import { ApiError } from '../api/client';
import { debug } from './debug';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additional?: Record<string, any>;
}

export class AppError extends Error {
  public readonly type: 'NETWORK' | 'VALIDATION' | 'AUTH' | 'UNKNOWN';
  public readonly userMessage: string;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    type: 'NETWORK' | 'VALIDATION' | 'AUTH' | 'UNKNOWN',
    userMessage: string,
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(originalError?.message || userMessage);
    this.type = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
    this.name = 'AppError';
  }
}

export const errorHandler = {
  // Handle API errors
  handleApiError: (error: ApiError, context?: ErrorContext): AppError => {
    debug.log('API Error:', error, context);

    let userMessage = 'Something went wrong. Please try again.';
    let type: 'NETWORK' | 'VALIDATION' | 'AUTH' | 'UNKNOWN' = 'UNKNOWN';

    if (error.status === 401) {
      type = 'AUTH';
      userMessage = 'Please log in again to continue.';
    } else if (error.status === 403) {
      type = 'AUTH';
      userMessage = 'You don\'t have permission to perform this action.';
    } else if (error.status === 400) {
      type = 'VALIDATION';
      userMessage = error.message || 'Please check your input and try again.';
    } else if (error.status === 404) {
      userMessage = 'The requested resource was not found.';
    } else if (error.status === 500) {
      userMessage = 'Server error. Please try again later.';
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      type = 'NETWORK';
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      userMessage = error.message;
    }

    return new AppError(type, userMessage, error as Error, context);
  },

  // Handle validation errors
  handleValidationError: (message: string, context?: ErrorContext): AppError => {
    debug.log('Validation Error:', message, context);
    return new AppError('VALIDATION', message, undefined, context);
  },

  // Handle network errors
  handleNetworkError: (error: Error, context?: ErrorContext): AppError => {
    debug.log('Network Error:', error, context);
    return new AppError(
      'NETWORK',
      'Network error. Please check your connection and try again.',
      error,
      context
    );
  },

  // Handle unknown errors
  handleUnknownError: (error: Error, context?: ErrorContext): AppError => {
    debug.log('Unknown Error:', error, context);
    return new AppError(
      'UNKNOWN',
      'An unexpected error occurred. Please try again.',
      error,
      context
    );
  },

  // Log error for monitoring/analytics
  logError: (error: AppError | Error, context?: ErrorContext): void => {
    const errorData = {
      message: error.message,
      type: error instanceof AppError ? error.type : 'UNKNOWN',
      context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    debug.log('Error logged:', errorData);

    // In production, send to error monitoring service
    if (!__DEV__) {
      // Example: crashlytics().recordError(error);
      // Example: analytics().logEvent('error', errorData);
    }
  },

  // Show user-friendly error message
  getDisplayMessage: (error: Error | AppError): string => {
    if (error instanceof AppError) {
      return error.userMessage;
    }

    // Fallback for unknown errors
    return 'An unexpected error occurred. Please try again.';
  },

  // Check if error requires authentication
  requiresAuth: (error: Error | AppError): boolean => {
    if (error instanceof AppError) {
      return error.type === 'AUTH';
    }
    return false;
  },

  // Check if error is recoverable
  isRecoverable: (error: Error | AppError): boolean => {
    if (error instanceof AppError) {
      return error.type === 'NETWORK' || error.type === 'VALIDATION';
    }
    return false;
  },
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandling = (): void => {
  // React Native doesn't have global error handlers like web browsers
  // But we can set up error tracking here for the parts that are supported

  // Note: In a production app, you would integrate crash reporting services here
  // Example: Crashlytics, Sentry, Bugsnag, etc.
  // if (!__DEV__) {
  //   // crashlytics().recordError();
  //   // sentry.init({ dsn: 'YOUR_DSN' });
  // }
};

// Hook for consistent error handling in components
export const useErrorHandler = () => {
  const handleError = (error: Error | ApiError, context?: ErrorContext) => {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if ('status' in error) {
      // API error
      appError = errorHandler.handleApiError(error as ApiError, context);
    } else {
      // Unknown error
      appError = errorHandler.handleUnknownError(error, context);
    }

    errorHandler.logError(appError, context);
    return appError;
  };

  return {
    handleError,
    getDisplayMessage: errorHandler.getDisplayMessage,
    requiresAuth: errorHandler.requiresAuth,
    isRecoverable: errorHandler.isRecoverable,
  };
};