
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCzxB7bvaBaaMyPPxsLOGVjZeQdOgvGmQM",
  authDomain: "twitter-2f301.firebaseapp.com",
  projectId: "twitter-2f301",
  storageBucket: "twitter-2f301.firebasestorage.app",
  messagingSenderId: "862100814342",
  appId: "1:862100814342:web:6cf8c61c4116f540242187"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;