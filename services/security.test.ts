import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, checkPinStrength, SECURITY_CONFIG } from './security';
import { webcrypto } from 'crypto';

// Polyfill minimal webcrypto for Node environment
globalThis.crypto = webcrypto as any;

describe('Security Service (PIN Hashing)', () => {
    it('hashes and verifies a PIN correctly', async () => {
        const pin = '1234';
        const hash = await hashPin(pin);

        // Hash format: salt:hash
        expect(hash).toContain(':');

        const isValid = await verifyPin(pin, hash);
        expect(isValid).toBe(true);

        const isInvalid = await verifyPin('4321', hash);
        expect(isInvalid).toBe(false);
    });

    it('checks PIN strength correctly', () => {
        const weakPin1 = checkPinStrength('0000');
        expect(weakPin1).toBeLessThan(50);

        const weakPin2 = checkPinStrength('1234');
        expect(weakPin2).toBeLessThan(50);

        const strongPin = checkPinStrength('82594');
        expect(strongPin).toBeGreaterThan(50);
    });
});
