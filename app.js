import './style.css'
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc } from "firebase/firestore";


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
const inputWeekSleepTime = document.getElementById('input_week_sleep_time');
const inputWeekWakeTime = document.getElementById('input_week_wake_time');
const inputWeekendSleepTime = document.getElementById('input_weekend_sleep_time');
const inputWeekendWakeTime = document.getElementById('input_weekend_wake_time');

signInBtn.onclick = () => signInWithPopup(auth, provider).catch((error) => console.log('error'));
signOutBtn.onclick = () => signOut(auth);

let user;
let unsubscribe;

auth.onAuthStateChanged(user => {
    if (user) {
        initLoggedInSection(user);
        
        getUserSettings();
        
        editUserSettings.onclick = () => {
            if (user == null) {
                return;
            }
        
            try {
                setDoc(doc(db, "user-settings", user.uid), {
                    uid: user.uid,
                    week_sleep_time : validateHourField(inputWeekSleepTime.value),
                    week_wake_time : validateHourField(inputWeekWakeTime.value),
                    weekend_sleep_time : validateHourField(inputWeekendSleepTime.value),
                    weekend_wake_time : validateHourField(inputWeekendWakeTime.value),
                });
                console.log("Users settings has been saved for user : ", user.displayName);
            } catch (e) {
                console.error("Error adding document: ", e);
            }
        }


    } else {
        unsubscribe && unsubscribe();
        hideLoggedInSection();
    }
});

function initLoggedInSection(loggedUser) {
    user = loggedUser;
    whenSignedIn.hidden = false;
    whenSignedOut.hidden = true;
    userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
}

function getUserSettings() {
    const userSettingsDoc = doc(db, "user-settings", user.uid);
    const userSettings = getDoc(userSettingsDoc);

    userSettings.then((settings) => {
        if (settings.exists) {
            let settingsData = settings.data();
            inputWeekSleepTime.value = formatHourForInput(settingsData.week_sleep_time);
            inputWeekWakeTime.value = formatHourForInput(settingsData.week_wake_time);
            inputWeekendSleepTime.value = formatHourForInput(settingsData.weekend_sleep_time);
            inputWeekendWakeTime.value = formatHourForInput(settingsData.weekend_wake_time);
        } else {
            inputWeekSleepTime.value = "00:00";
            inputWeekWakeTime.value = "00:00";
            inputWeekendSleepTime.value = "00:00"
            inputWeekendWakeTime.value = "00:00";
        }
    });
    
}

function hideLoggedInSection() {
    user = null;
    whenSignedIn.hidden = true;
    whenSignedOut.hidden = false;
    userDetails.innerHTML = '';
}

/**
 * Remove the ":" in an hh:mm format String
 * 
 * @param {String} value 
 * @returns String at format "XXXX" containing;
 */
function validateHourField(value) {
    if (value ==  undefined || value == "") {
        return "0000";
    } else  {
        return value.replace(":", "");
    }
}

/**
 * Add the ":" in an hhmm format String
 * 
 * @param {String} value 
 * @returns String at format "XX:XX" containing;
 */
function formatHourForInput(hour) {
    if (hour ==  undefined || hour == "") {
        return "00:00";
    } else {
        return [hour.slice(0, 2), ":" , hour.slice(2)].join('');
    }
}