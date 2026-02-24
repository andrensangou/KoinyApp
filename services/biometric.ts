import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface BiometricStatus {
    isAvailable: boolean;
    biometryType: 'face' | 'fingerprint' | 'none';
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricAvailability(): Promise<BiometricStatus> {
    // Only available on native platforms
    if (!Capacitor.isNativePlatform()) {
        return { isAvailable: false, biometryType: 'none' };
    }

    try {
        const result = await NativeBiometric.isAvailable();

        let biometryType: 'face' | 'fingerprint' | 'none' = 'none';
        if (result.biometryType === BiometryType.FACE_ID || result.biometryType === BiometryType.FACE_AUTHENTICATION) {
            biometryType = 'face';
        } else if (result.biometryType === BiometryType.TOUCH_ID || result.biometryType === BiometryType.FINGERPRINT) {
            biometryType = 'fingerprint';
        }

        return {
            isAvailable: result.isAvailable,
            biometryType
        };
    } catch (error) {
        console.warn('[Biometric] Not available:', error);
        return { isAvailable: false, biometryType: 'none' };
    }
}

/**
 * Prompt the user for biometric authentication
 * Returns true if authentication was successful
 */
export async function authenticateWithBiometric(reason: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        await NativeBiometric.verifyIdentity({
            reason,
            title: 'Koiny',
            subtitle: reason,
            useFallback: false, // Don't fallback to device passcode
            maxAttempts: 3,
        });
        return true; // Success — user was authenticated
    } catch (error) {
        console.warn('[Biometric] Auth failed:', error);
        return false; // Failed or cancelled
    }
}

/**
 * Get user-friendly name for the biometric type
 */
export function getBiometricLabel(type: 'face' | 'fingerprint' | 'none', language: string): string {
    if (type === 'face') {
        return 'Face ID';
    }
    if (type === 'fingerprint') {
        return 'Touch ID';
    }
    return language === 'fr' ? 'Biométrie' : language === 'nl' ? 'Biometrie' : 'Biometrics';
}

/**
 * Get icon class for the biometric type
 */
export function getBiometricIcon(type: 'face' | 'fingerprint' | 'none'): string {
    if (type === 'face') {
        return 'fa-solid fa-face-smile';
    }
    if (type === 'fingerprint') {
        return 'fa-solid fa-fingerprint';
    }
    return 'fa-solid fa-shield-halved';
}
