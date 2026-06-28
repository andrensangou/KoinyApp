// Stub for firebase/messaging — used by @capacitor-firebase/messaging web.js.
// On native (iOS/Android), the real native Firebase SDK handles messaging via the
// native bridge. This stub prevents the web build from failing to resolve the
// firebase/messaging module (optional peer dep, not installed).
export function getMessaging() { return null; }
export function getToken() { return Promise.resolve(''); }
export function deleteToken() { return Promise.resolve(true); }
export function onMessage() { return () => {}; }
export function isSupported() { return Promise.resolve(false); }
