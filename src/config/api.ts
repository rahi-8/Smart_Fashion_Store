import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  extra.apiUrl ||
  'http://192.168.0.127:3000';