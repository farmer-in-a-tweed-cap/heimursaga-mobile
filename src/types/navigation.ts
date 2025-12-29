import { NavigatorScreenParams } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Main navigation parameter lists
export type MainStackParamList = {
  Tabs: undefined;
  UserJournal: { username: string };
  MapLocationSelect: {
    onLocationSelect: (location: { latitude: number; longitude: number; name?: string }) => void;
  };
  LogEntry: {
    location?: { latitude: number; longitude: number; name?: string };
    editId?: string;
  };
};

export type TabParamList = {
  Explore: undefined;
  Map: undefined;
  Journal: undefined;
  Bookmarks: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

// Navigation prop types
export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;
export type MainStackNavigationProp = StackNavigationProp<MainStackParamList>;
export type AuthStackNavigationProp = StackNavigationProp<AuthStackParamList>;

// Screen navigation prop types
export type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
export type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;
export type ExploreScreenNavigationProp = StackNavigationProp<MainStackParamList>;
export type MapScreenNavigationProp = StackNavigationProp<MainStackParamList>;
export type JournalScreenNavigationProp = StackNavigationProp<MainStackParamList>;
export type BookmarksScreenNavigationProp = StackNavigationProp<MainStackParamList>;
export type ProfileScreenNavigationProp = StackNavigationProp<MainStackParamList>;

// Route prop types for screens that receive parameters
export type UserJournalRouteProp = { params: { username: string } };
export type MapLocationSelectRouteProp = {
  params: {
    onLocationSelect: (location: { latitude: number; longitude: number; name?: string }) => void;
  };
};
export type LogEntryRouteProp = {
  params: {
    location?: { latitude: number; longitude: number; name?: string };
    editId?: string;
  };
};

// Global navigation type augmentation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}