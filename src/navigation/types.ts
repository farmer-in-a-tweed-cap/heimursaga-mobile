export type MainStackParamList = {
  Tabs: undefined;
  UserJournal: { username: string };
  LogEntry: { waypoint?: { id: number; title?: string; lat: number; lon: number } };
  MapLocationSelect: {
    initialLocation?: { lat: number; lon: number };
    onLocationSelect?: (location: { lat: number; lon: number }) => void;
  };
  Submenu: undefined;
  Settings: undefined;
};
