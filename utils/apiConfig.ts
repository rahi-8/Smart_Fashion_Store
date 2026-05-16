// app/utils/apiConfig.ts
import { Platform } from 'react-native';

// আপনার কম্পিউটারের সঠিক IP
const COMPUTER_IP = '192.168.0.105';
const PORT = 3000;

export const getApiUrl = (): string => {
  // সরাসরি আপনার কম্পিউটারের IP ব্যবহার করুন
  return `http://${COMPUTER_IP}:${PORT}`;
};

export const checkServerConnection = async (): Promise<boolean> => {
  try {
    const url = getApiUrl();
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log('✅ Server connected:', data);
    return true;
  } catch (error) {
    console.log('❌ Server connection failed:', error);
    return false;
  }
};