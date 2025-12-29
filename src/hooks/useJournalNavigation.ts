import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';

export const useJournalNavigation = () => {
  let navigation: StackNavigationProp<MainStackParamList> | null = null;
  
  try {
    navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  } catch (error) {
    // Navigation not available (e.g., in Modal)
    console.log('🔥 Navigation not available:', error);
  }

  const navigateToUserJournal = (username: string) => {
    if (navigation) {
      console.log('🔥 Navigating to UserJournal with username:', username);
      navigation.navigate('UserJournal', { username });
      return true;
    } else {
      console.log('🔥 Navigation not available');
      return false;
    }
  };

  return { navigateToUserJournal, hasNavigation: !!navigation };
};