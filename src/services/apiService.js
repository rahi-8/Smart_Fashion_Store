// src/services/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// আপনার কম্পিউটারের নাম (hostname থেকে পাওয়া)
const COMPUTER_NAME = 'Rahi-123456';

// পোর্ট নম্বর
const PORT = 3000;

// সম্ভাব্য সব API URLs (IP পরিবর্তন হলেও কাজ করবে)
const POSSIBLE_API_URLS = [
  `http://${COMPUTER_NAME}.local:${PORT}`,      // Best for local network
  `http://${COMPUTER_NAME}.mshome.net:${PORT}`, // Windows Home Network
  `http://10.251.152.61:${PORT}`,               // আপনার বর্তমান IP
  `http://192.168.0.113:${PORT}`,               // আপনার পুরনো IP
  `http://localhost:${PORT}`,                   // Emulator এর জন্য
  `http://10.0.2.2:${PORT}`,                    // Android Emulator এর জন্য
];

// ক্যাশে করার জন্য কী
const CACHE_KEY = '@SmartFashion_Working_API_URL';

// URL কাজ করছে কিনা চেক করার ফাংশন
async function isUrlWorking(url) {
  try {
    console.log(`🔍 Checking URL: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ URL working: ${url}`);
      return true;
    }
    return false;
  } catch (error) {
    console.log(`❌ URL not working: ${url}`, error.message);
    return false;
  }
}

// মেইন ফাংশন: কাজ করা URL খুঁজে বের করা
export async function getWorkingApiUrl() {
  try {
    // ১ম: ক্যাশে চেক করা
    const cachedUrl = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedUrl) {
      console.log(`📦 Checking cached URL: ${cachedUrl}`);
      const isValid = await isUrlWorking(cachedUrl);
      if (isValid) {
        console.log(`✅ Using cached URL: ${cachedUrl}`);
        return cachedUrl;
      } else {
        console.log(`⚠️ Cached URL not working, clearing cache`);
        await AsyncStorage.removeItem(CACHE_KEY);
      }
    }
    
    // ২য়: সব URL চেক করা
    console.log('🔍 Checking all possible URLs...');
    for (const url of POSSIBLE_API_URLS) {
      const isValid = await isUrlWorking(url);
      if (isValid) {
        await AsyncStorage.setItem(CACHE_KEY, url);
        console.log(`✅✅✅ Found working URL: ${url}`);
        return url;
      }
    }
    
    // ৩য়: কোনো URL কাজ না করা
    console.log('⚠️ No working URL found, using default');
    return POSSIBLE_API_URLS[0];
    
  } catch (error) {
    console.error('Error in getWorkingApiUrl:', error);
    return POSSIBLE_API_URLS[0];
  }
}

// API URL রিফ্রেশ করার ফাংশন
export async function refreshApiUrl() {
  console.log('🔄 Refreshing API URL...');
  await AsyncStorage.removeItem(CACHE_KEY);
  return await getWorkingApiUrl();
}

// API কল করার হেলপার ফাংশন
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = await getWorkingApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  return await response.json();
}

// OTP specific functions
export const otpService = {
  sendOTP: async (email, name) => {
    try {
      const result = await apiRequest('/api/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
      return result;
    } catch (error) {
      console.error('Send OTP failed:', error);
      await refreshApiUrl();
      throw error;
    }
  },
  
  verifyOTP: async (email, otp) => {
    return await apiRequest('/api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },
  
  resendOTP: async (email, name) => {
    return await apiRequest('/api/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  },
};