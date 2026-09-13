import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.costcosaver.app',
  appName: 'COSTCO-SAVER',
  webDir: 'dist',
  bundledWebRuntime: false,
  loggingBehavior: 'production',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0B1220',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    BarcodeScanner: {
      // Empty defaults so the runtime plugin decides capability
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B1220',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B1220',
    captureInput: true,
  },
};

export default config;
