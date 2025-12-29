import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG, API_HEADERS } from './config';
import { secureStorage, STORAGE_KEYS } from '../utils/storage';
import { debug } from '../utils/debug';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': API_HEADERS.CONTENT_TYPE.JSON,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add JWT token
    this.instance.interceptors.request.use(
      async (config) => {
        // Debug logging
        debug.log(`Making API request to: ${config.baseURL}${config.url}`);
        
        // Get token from secure storage if not already set
        if (!this.authToken) {
          this.authToken = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        }

        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle auth errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        // Debug logging
        debug.log('API Error:', error.code, error.message);
        debug.log('Error response:', error.response?.status, error.response?.data);
        
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Clear stored token and auth state
          await this.clearAuth();
          
          // Optionally redirect to login screen
          // This would be handled by the navigation system
          
          return Promise.reject({
            message: 'Session expired. Please login again.',
            status: 401,
            code: 'UNAUTHORIZED',
          } as ApiError);
        }

        // Handle other errors
        let message = error.response?.data?.message || error.message || 'An error occurred';
        
        // Provide more user-friendly messages for common network errors
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          message = 'Connection timeout. Please check your internet connection and try again.';
        } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          message = 'Unable to connect to server. Please check your internet connection.';
        }
        
        const apiError: ApiError = {
          message,
          status: error.response?.status,
          code: error.response?.data?.code || error.code,
        };

        return Promise.reject(apiError);
      }
    );
  }

  // Authentication methods
  async setAuthToken(token: string) {
    this.authToken = token;
    await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async clearAuth() {
    this.authToken = null;
    await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    // Clear user session from regular storage
    await secureStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    // Note: Keep BIOMETRIC_REFRESH_TOKEN unless explicitly clearing biometric setup
  }

  async clearBiometricAuth() {
    // Clear biometric-specific tokens
    await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS); // Clean up legacy
  }

  async getStoredToken(): Promise<string | null> {
    if (!this.authToken) {
      this.authToken = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    return this.authToken;
  }

  // Generic request method
  async request<T = any>(
    endpoint: string,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      const response = await this.instance.request<T>({
        url: endpoint,
        ...config,
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      data,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      data,
    });
  }

  async delete<T = any>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      data,
    });
  }

  // Upload method for multipart/form-data
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;