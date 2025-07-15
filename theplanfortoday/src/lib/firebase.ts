// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD8kNPG...YOUR_API_KEY...",
  authDomain: "the-plan-for-today.firebaseapp.com",
  projectId: "the-plan-for-today",
  storageBucket: "the-plan-for-today.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);

export const getAnalyticsIfSupported = async () => {
  if (typeof window !== "undefined" && (await isSupported())) {
    return getAnalytics(app);
  }
  return undefined;
};

export { app };