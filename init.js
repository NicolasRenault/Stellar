// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration

const firebaseConfig = {
    apiKey: "AIzaSyDN3EXcPw6y1FAlVJX0t2HYYrekKAaMicE",
    authDomain: "stellar-914ff.firebaseapp.com",
    projectId: "stellar-914ff",
    storageBucket: "stellar-914ff.appspot.com",
    messagingSenderId: "977310492246",
    appId: "1:977310492246:web:fec8cb19a72d45c6a8fdf7"
};
// Initialize Firebase

const app = initializeApp(firebaseConfig);
console.log(app)