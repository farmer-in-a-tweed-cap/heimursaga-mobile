import { ENV } from '../config/environment';

// API Configuration
export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  TIMEOUT: 30000,
};

// API Headers
export const API_HEADERS = {
  CONTENT_TYPE: {
    JSON: 'application/json',
    FORM_DATA: 'multipart/form-data',
  },
};

// API Methods
export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

// API Routes - mobile-specific endpoints
export const API_ROUTES = {
  // Authentication - using standard JWT endpoints
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  SESSION: '/auth/user',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',
  VERIFY_EMAIL: '/auth/verify-email',
  REFRESH_TOKEN: '/auth/refresh',
  
  // Posts
  POSTS: {
    GET: '/posts',
    GET_BY_ID: (id: string) => `/posts/${id}`,
    CREATE: '/posts',
    UPDATE: (id: string) => `/posts/${id}`,
    DELETE: (id: string) => `/posts/${id}`,
    LIKE: (id: string) => `/posts/${id}/like`,
    BOOKMARK: (id: string) => `/posts/${id}/bookmark`,
    COMMENTS: {
      GET: (postId: string) => `/posts/${postId}/comments`,
      CREATE: (postId: string) => `/posts/${postId}/comments`,
      TOGGLE: (postId: string) => `/posts/${postId}/comments/toggle`,
    },
  },

  // Comments
  COMMENTS: {
    UPDATE: (id: string) => `/comments/${id}`,
    DELETE: (id: string) => `/comments/${id}`,
  },
  
  // Users
  USERS: {
    GET: '/users',
    GET_BY_USERNAME: (username: string) => `/users/${username}`,
    FOLLOW: (username: string) => `/users/${username}/follow`,
    UNFOLLOW: (username: string) => `/users/${username}/unfollow`,
    FOLLOWERS: (username: string) => `/users/${username}/followers`,
    FOLLOWING: (username: string) => `/users/${username}/following`,
    POSTS: (username: string) => `/users/${username}/posts`,
    MAP: (username: string) => `/users/${username}/map`,
    TRIPS: (username: string) => `/users/${username}/trips`,
  },
  
  // User settings
  USER: {
    POSTS: '/user/posts',
    DRAFTS: '/user/drafts',
    BOOKMARKS: '/user/bookmarks',
    NOTIFICATIONS: '/user/notifications',
    BADGE_COUNT: '/user/badge-count',
    SETTINGS: {
      PROFILE: '/user/settings/profile',
    },
    UPDATE_PICTURE: '/user/picture',
  },
  
  // Map
  MAP: {
    QUERY: '/map',
    WAYPOINTS: {
      CREATE: '/map/waypoints',
      UPDATE: (id: number) => `/map/waypoints/${id}`,
      DELETE: (id: number) => `/map/waypoints/${id}`,
      GET_BY_ID: (id: number) => `/map/waypoints/${id}`,
    },
  },
  
  // Trips
  TRIPS: {
    GET: '/trips',
    GET_BY_ID: (id: string) => `/trips/${id}`,
    CREATE: '/trips',
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
  },
  
  // Media Upload
  UPLOAD: '/upload',
  
  // Search
  SEARCH: '/search',
  
  // Messages (for MVP social features)
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    CONVERSATION: (username: string) => `/messages/${username}`,
    SEND: '/messages/send',
    MARK_READ: (messageId: string) => `/messages/${messageId}/read`,
    UNREAD_COUNT: '/messages/unread-count',
  },
} as const;