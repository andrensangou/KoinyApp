import { Capacitor } from '@capacitor/core';

// Evaluated once at module load — platform never changes at runtime
const platform = Capacitor.getPlatform();

export const isAndroid = platform === 'android';
export const isIOS = platform === 'ios';
export const isWeb = platform === 'web';
export const isNative = Capacitor.isNativePlatform();
