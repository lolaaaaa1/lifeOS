import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'app_pin';

export const pinStore = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(KEY);
  },
  async set(pin: string): Promise<void> {
    await AsyncStorage.setItem(KEY, pin);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
