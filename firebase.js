import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    onSnapshot,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

/*
====================================================
 DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY
====================================================
*/

const firebaseConfig = {
  apiKey: "AIzaSyAur6POIf--3HPk1C44GE91nHk3Q1_i2oY",
  authDomain: "wchat-a721e.firebaseapp.com",
  projectId: "wchat-a721e",
  storageBucket: "wchat-a721e.firebasestorage.app",
  messagingSenderId: "149012363890",
  appId: "1:149012363890:web:d0f0df9e59d211a89de0eb",
  measurementId: "G-KY53RLEWFZ"
};


/*
====================================================
 EXPORT
====================================================
*/

export {

    app,

    auth,

    db,

    storage,

    createUserWithEmailAndPassword,

    signInWithEmailAndPassword,

    onAuthStateChanged,

    signOut,

    doc,

    getDoc,

    setDoc,

    updateDoc,

    deleteDoc,

    collection,

    query,

    where,

    getDocs,

    addDoc,

    orderBy,

    onSnapshot,

    serverTimestamp,

    runTransaction,

    ref,

    uploadBytesResumable,

    getDownloadURL

};
