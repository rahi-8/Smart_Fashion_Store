import { Platform } from 'react-native';

export const shadows = {
  small: Platform.OS === 'web'
    ? { boxShadow: '0px 1px 4px rgba(0,0,0,0.1)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },

  medium: Platform.OS === 'web'
    ? { boxShadow: '0px 3px 10px rgba(0,0,0,0.15)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
      },

  large: Platform.OS === 'web'
    ? { boxShadow: '0px 6px 20px rgba(0,0,0,0.2)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
      },
};