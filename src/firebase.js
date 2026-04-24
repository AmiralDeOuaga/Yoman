import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAn1kSnAzJF862qEtAaaDccepDWnyM3-3g",
  authDomain: "yoman-d45bf.firebaseapp.com",
  projectId: "yoman-d45bf",
  storageBucket: "yoman-d45bf.firebasestorage.app",
  messagingSenderId: "515991232927",
  appId: "1:515991232927:web:26741e2c4f2a7c6c435daa",
  measurementId: "G-3DZWR7EQJ5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
