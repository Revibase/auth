"use client"; // Ensure this runs only on the client

import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { Firestore, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyDnd-tvAfR-4YWOFA7A6Shg-LU2mb-T0u0",
  authDomain: "revi-wallet-490e3.firebaseapp.com",
  projectId: "revi-wallet-490e3",
  storageBucket: "revi-wallet-490e3.firebasestorage.app",
  messagingSenderId: "1018601631301",
  appId: "1:1018601631301:web:ff7145104bd470c1dafd2c",
  measurementId: "G-0X62Y0EYWE",
};

// Custom Hook for Client-Side Firebase Initialization
export function useFirebase() {
  const [db, setDb] = useState<Firestore | null>(null);

  useEffect(() => {
    // Ensure Firebase initializes only on the client
    const firebaseApp = initializeApp(firebaseConfig);

    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(
        "6Lce3PAqAAAAAJfCx_O6XEIM-wgkCefvrEwj3xVj"
      ),
      isTokenAutoRefreshEnabled: true,
    });

    setDb(getFirestore(firebaseApp));
  }, []);

  return { db };
}
