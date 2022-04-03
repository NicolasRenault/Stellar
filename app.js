import './style.css'
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyDN3EXcPw6y1FAlVJX0t2HYYrekKAaMicE",
    authDomain: "stellar-914ff.firebaseapp.com",
    projectId: "stellar-914ff",
    storageBucket: "stellar-914ff.appspot.com",
    messagingSenderId: "977310492246",
    appId: "1:977310492246:web:fec8cb19a72d45c6a8fdf7"
};

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const db = getFirestore(firebase);
const provider = new GoogleAuthProvider();

const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const whenSignedIn = document.getElementById("whenSignedIn");
const whenSignedOut = document.getElementById("whenSignedOut");
const userDetails = document.getElementById('userDetails');
const editUserSettings = document.getElementById("editUserSettings");

signInBtn.onclick = () => signInWithPopup(auth, provider).catch((error) => console.log('error'));
signOutBtn.onclick = () => signOut(auth);

auth.onAuthStateChanged(user => {
    if (user) {
        whenSignedIn.hidden = false;
        whenSignedOut.hidden = true;
        userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
        
    } else {
        whenSignedIn.hidden = true;
        whenSignedOut.hidden = false;
        userDetails.innerHTML = '';
    }
});


// editUserSettings.onclick = () => {
//     try {
//         const docRef = setDoc(doc(db, "user-settings", user.uid), {
//             uid: user.uid,
//             week_sleep_time : "1000",
//             week_wake_time : "0730",
//             weekend_sleep_time : "0130",
//             weekend_wake_time : "0945"
//         });
//         console.log("Document written with ID: ", docRef.id);
//     } catch (e) {
//         console.error("Error adding document: ", e);
//     }
// }