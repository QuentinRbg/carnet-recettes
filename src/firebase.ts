import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration du projet Firebase. Ces valeurs ne sont pas secrètes :
// c'est la règle de sécurité (firestore.rules) qui protège les données.
const firebaseConfig = {
  apiKey: "AIzaSyABPnRksVKawbpyWJ_WsjaZGcHc42opNq4",
  authDomain: "carnet-recettes-bbbf7.firebaseapp.com",
  projectId: "carnet-recettes-bbbf7",
  storageBucket: "carnet-recettes-bbbf7.firebasestorage.app",
  messagingSenderId: "631157348415",
  appId: "1:631157348415:web:61bc05b370c9096067408a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
