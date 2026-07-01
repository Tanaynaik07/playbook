import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, orderBy, onSnapshot, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------------------------------------------------------------------
// FILL THIS IN with your Firebase project's config (Project settings ->
// General -> Your apps -> SDK setup and configuration). You can reuse the
// same Firebase project as WordTide, or create a fresh one - either works.
// ---------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBJfNIYbXtFhFVHZNWplkkgOVOU626xOSw",
  authDomain: "playbook0710.firebaseapp.com",
  projectId: "playbook0710",
  storageBucket: "playbook0710.firebasestorage.app",
  messagingSenderId: "211363681228",
  appId: "1:211363681228:web:bb905cbd0838a6830ec369",
  measurementId: "G-5LNM4F28JZ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function login() {
  return signInWithPopup(auth, provider);
}
export function logout() {
  return signOut(auth);
}
export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, orderBy, onSnapshot, setDoc,
};
