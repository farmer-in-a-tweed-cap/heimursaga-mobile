import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigatorWrapper } from './TabNavigatorWrapper';
import { UserJournalScreen, LogEntryScreen, MapLocationSelectScreen, SubmenuScreen, SettingsScreen } from '../screens';
import { MainStackParamList } from './types';

const Stack = createStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigatorWrapper} />
      <Stack.Screen
        name="UserJournal"
        component={UserJournalScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LogEntry"
        component={LogEntryScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MapLocationSelect"
        component={MapLocationSelectScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Submenu"
        component={SubmenuScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};