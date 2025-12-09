import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware secure storage utility
 * - Uses expo-secure-store on iOS/Android
 * - Uses localStorage on web
 */

const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('localStorage.getItem error:', error);
        return null;
      }
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('localStorage.setItem error:', error);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('localStorage.removeItem error:', error);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
