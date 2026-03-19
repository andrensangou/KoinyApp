import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.koiny.app',
  appName: 'Koiny',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#3730A3",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      launchFadeOutDuration: 500,
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "165597226617-2uhqfl4khjnfdi41jd84uv8j6tmka1as.apps.googleusercontent.com",
      iosClientId: "165597226617-d32lvds9bq8vpvglc6kh9c90s817eqe2.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
  server: {
    iosScheme: 'capacitor',
    hostname: 'localhost'
  }
};

export default config;
