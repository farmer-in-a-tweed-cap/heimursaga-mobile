import React from 'react';
import { TabNavigator } from './TabNavigator';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from './types';

type NavigationProp = StackNavigationProp<MainStackParamList>;

export const TabNavigatorWrapper: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  return <TabNavigator navigation={navigation} />;
};