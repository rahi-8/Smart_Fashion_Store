import { router } from 'expo-router';
import { Platform } from 'react-native';

export const useCrossPlatformNavigation = () => {
  const navigateTo = (route: string, params?: Record<string, string>) => {
    try {
      let path = `/(admin)/${route}`;
      if (params) {
        const queryString = new URLSearchParams(params).toString();
        path = `${path}?${queryString}`;
      }
      router.push(path as any);
    } catch (error) {
      console.error('Navigation error:', error);
      if (Platform.OS === 'web') {
        let url = `/${route}`;
        if (params) {
          url += `?${new URLSearchParams(params).toString()}`;
        }
        window.location.href = url;
      }
    }
  };

  return { navigateTo };
};
