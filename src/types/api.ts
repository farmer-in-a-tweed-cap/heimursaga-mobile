// Session/Auth types used by the mobile app
export interface ISessionUser {
  id?: string;
  role: string;
  username: string;
  email: string;
  picture?: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  stripeAccountConnected?: boolean;
  favoriteLocations?: string[];
}

export interface ISessionUserGetResponse extends ISessionUser {}

// Login
export interface ILoginPayload {
  login: string;
  password: string;
}

export interface ILoginResponse {
  data: {
    token: string;
    refreshToken?: string;
    user?: ISessionUser;
  };
  success: boolean;
  message?: string;
}

// Signup
export interface ISignupPayload {
  email: string;
  username: string;
  password: string;
  recaptchaToken?: string;
}

// Password reset
export interface IPasswordResetPayload {
  email: string;
}

export interface IPasswordUpdatePayload {
  password: string;
  token: string;
}

// Post related types
export interface IPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
    picture?: string;
  };
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  bookmarksCount: number;
  commentsCount: number;
  commentsEnabled?: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  tags?: string[];
}

export interface IPostQueryResponse {
  data: IPost[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface IPostGetByIdResponse {
  data: IPost;
}

export interface IPostCreateResponse {
  data: IPost;
}

export interface IUserDetail {
  id: string;
  username: string;
  email?: string;
  picture?: string;
  bio?: string;
  locationFrom?: string;
  locationLives?: string;
  joinedDate?: Date;
  creator?: boolean;
  portfolio?: string;
  followed?: boolean;
  you?: boolean;
  stripeAccountConnected?: boolean;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundJourneyId?: string;
}

export interface IUserPostsQueryResponse {
  data: IPost[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface IUserProfile {
  id: string;
  username: string;
  email: string;
  picture?: string;
  bio?: string;
  locationFrom?: string;
  locationLives?: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  settings?: {
    privacy: {
      profileVisibility: 'public' | 'private';
      showEmail: boolean;
      showLocation: boolean;
    };
    notifications: {
      email: boolean;
      push: boolean;
      followers: boolean;
      likes: boolean;
      comments: boolean;
    };
  };
}

export interface IUserSettingsProfileGetResponse {
  data: IUserProfile;
}

// Map and waypoint types
export interface IWaypoint {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  type: 'visited' | 'planned' | 'favorite';
  userId: string;
  postId?: string;
  createdAt: string;
  updatedAt: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
}

export interface IMapQueryResponse {
  waypoints: IWaypoint[];
}

export interface IWaypointCreateResponse {
  data: IWaypoint;
}

// Trip types
export interface ITrip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isPublic: boolean;
  userId: string;
  waypoints: IWaypoint[];
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  stats?: {
    totalDistance: number;
    totalDuration: number;
    totalWaypoints: number;
  };
}

export interface ITripGetAllResponse {
  data: ITrip[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ITripGetByIdResponse {
  data: ITrip;
}

export interface ITripCreateResponse {
  data: ITrip;
}

// Media upload types
export interface IMediaUploadResponse {
  data: {
    url: string;
    type: 'image' | 'video';
    size: number;
    filename: string;
    thumbnail?: string;
  };
}

// Message types
export interface IConversation {
  id: string;
  participants: {
    id: string;
    username: string;
    picture?: string;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface IMessage {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  isRead: boolean;
  type: 'text' | 'image' | 'location';
  metadata?: {
    imageUrl?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
    };
  };
}

export interface IConversationsGetResponse {
  data: IConversation[];
}

export interface IMessagesGetResponse {
  data: IMessage[];
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface IMessageUnreadCountResponse {
  data: { count: number };
}

// Comment types
export interface ICommentDetail {
  id: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: {
    username: string;
    picture?: string;
    creator?: boolean;
  };
  createdByMe: boolean;
  parentId?: string;
  repliesCount?: number;
  replies?: ICommentDetail[];
}

export interface ICommentListResponse {
  data: ICommentDetail[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ICommentCreatePayload {
  content: string;
  parentId?: string;
}

export interface ICommentUpdatePayload {
  content: string;
}