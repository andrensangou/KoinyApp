import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

interface KoinyBiometricPlugin {
    isAvailable(): Promise<{ isAvailable: boolean; biometryType: string }>;
    verifyIdentity(options: { reason: string; useFallback?: boolean }): Promise<void>;
}

// Register the custom in-app plugin (BiometricPlugin.swift in the App target)
const KoinyBiometric = registerPlugin<KoinyBiometricPlugin>('KoinyBiometric');

export interface BiometricStatus {
    isAvailable: boolean;
    biometryType: 'face' | 'fingerprint' | 'none';
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricAvailability(): Promise<BiometricStatus> {
    console.log('[Biometric] Checking — platform:', Capacitor.getPlatform());
    if (!Capacitor.isNativePlatform()) {
        return { isAvailable: false, biometryType: 'none' };
    }

    try {
        const result = await KoinyBiometric.isAvailable();
        const type = result.biometryType as 'face' | 'fingerprint' | 'none';
        console.log('[Biometric] Available:', result.isAvailable, 'Type:', type);
        return { isAvailable: result.isAvailable, biometryType: type };
    } catch (error) {
        console.warn('[Biometric] Not available — error:', JSON.stringify(error));
        return { isAvailable: false, biometryType: 'none' };
    }
}

/**
 * Prompt the user for biometric authentication.
 * Returns true if authentication was successful.
 */
export async function authenticateWithBiometric(reason: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        await KoinyBiometric.verifyIdentity({ reason, useFallback: true });
        return true;
    } catch (error) {
        console.warn('[Biometric] Auth failed:', error);
        return false;
    }
}

/**
 * Get user-friendly name for the biometric type
 */
export function getBiometricLabel(type: 'face' | 'fingerprint' | 'none', language: string): string {
    if (type === 'face') return 'Face ID';
    if (type === 'fingerprint') return 'Touch ID';
    return language === 'fr' ? 'Biométrie' : language === 'nl' ? 'Biometrie' : 'Biometrics';
}

/**
 * Get icon class for the biometric type
 */
export function getBiometricIcon(type: 'face' | 'fingerprint' | 'none'): string {
    if (type === 'face') return 'fa-solid fa-face-smile';
    if (type === 'fingerprint') return 'fa-solid fa-fingerprint';
    return 'fa-solid fa-shield-halved';
}
