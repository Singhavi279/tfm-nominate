const trim = (value?: string) => value?.trim();

export const firebaseConfig = {
  projectId: trim(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  appId: trim(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  apiKey: trim(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: trim(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  measurementId: trim(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
  messagingSenderId: trim(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  storageBucket: trim(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
};
