import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// The React Native build of @firebase/auth exports getReactNativePersistence, but the public
// typings that TypeScript resolves do not declare it.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
