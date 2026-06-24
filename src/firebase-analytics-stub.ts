// Stub for firebase/analytics — used by @capacitor-firebase/analytics web.js
// On native Android, the real Firebase SDK handles analytics via the native bridge.
// This stub prevents the browser from failing to resolve the firebase/analytics module.
export function getAnalytics() { return null; }
export function logEvent() {}
export function setAnalyticsCollectionEnabled() {}
export function setConsent() {}
export function setUserId() {}
export function setUserProperties() {}
