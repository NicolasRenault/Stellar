import './style.css'
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, query, where, getDocs} from "firebase/firestore";
import { DateTime } from "luxon";


/** ------------
 * 
 * Variables
 * 
 ------------- */

const firebaseConfig = {
    apiKey: "AIzaSyDN3EXcPw6y1FAlVJX0t2HYYrekKAaMicE",
    authDomain: "stellar-914ff.firebaseapp.com",
    projectId: "stellar-914ff",
    storageBucket: "stellar-914ff.appspot.com",
    messagingSenderId: "977310492246",
    appId: "1:977310492246:web:fec8cb19a72d45c6a8fdf7"
};

/**
 * Firebase var
 */
const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const db = getFirestore(firebase);
const provider = new GoogleAuthProvider();

/**
 * DOM elements
 */
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("sign_out_btn");
const whenSignedIn = document.getElementById("when_signed_in");
const whenSignedOut = document.getElementById("when_signed_out");
const userDetails = document.getElementById('user_details');
const editUserSettings = document.getElementById("edit_user_settings");
const inputWeekSleepTime = document.getElementById('input_week_sleep_time');
const inputWeekWakeTime = document.getElementById('input_week_wake_time');
const inputWeekendSleepTime = document.getElementById('input_weekend_sleep_time');
const inputWeekendWakeTime = document.getElementById('input_weekend_wake_time');

signInBtn.onclick = () => signInWithPopup(auth, provider).catch((error) => console.log('error'));
signOutBtn.onclick = () => signOut(auth);

let user;
let unsubscribe;

let dateList = [];
let currentDateIndex;


/** ------------
 * 
 * Listeners
 * 
 ------------- */

auth.onAuthStateChanged(user => {
    if (user) {
        loginUser(user);
    } else {
        unsubscribe && unsubscribe();
        logoutUser();
    }
});

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

/** ------------
 * 
 * Methods
 * 
 ------------- */

/**
 * Init the user informations 
 * 
 * @param {User} loggedUser 
 */
function loginUser(loggedUser) {
    user = loggedUser;
    whenSignedIn.hidden = false;
    whenSignedOut.hidden = true;

    getUserSettings();
    initDateList();
}

/**
 * Get user informations from database and display it
 */
function getUserSettings() {
    const userSettingsDoc = doc(db, "user-settings", user.uid);
    const userSettings = getDoc(userSettingsDoc);

    /**
     * User sleep information
     */
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

    /**
     * User detail information
     */
    userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
}

/**
 * Reset all the user informations displayed
 */
function resetUserSettings() {
    inputWeekSleepTime.value = "00:00";
    inputWeekWakeTime.value = "00:00";
    inputWeekendSleepTime.value = "00:00"
    inputWeekendWakeTime.value = "00:00";

    userDetails.innerHTML = '';
}

/**
 * Hide the logged in section and show the logged out sessions
 */
function logoutUser() {
    user = null;
    whenSignedIn.hidden = true;
    whenSignedOut.hidden = false;
    dateList = [];

    resetUserSettings();
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

function initDateList() {
    let now = DateTime.now(); //TODO trouvé l'équilibre entre last et next
    let lastTwoWeek = DateTime.now().minus({day: 15});
    let lastMonth = DateTime.now().minus({ month: 1 });
    let nextMonth = DateTime.now().plus({ day: 7 });
    let monthIndex = lastMonth;

    let promiseList = [];

    while (monthIndex.toLocaleString() !== nextMonth.toLocaleString()) {
        let ISO =  monthIndex.toISODate();

        let sleepScheduleCollection = collection(db, "sleep-schedule");
        let sleepScheduleQuery = query(sleepScheduleCollection, where("uid", "==", user.uid), where("ISO", "==", ISO));
        
        let querySnapshot = getDocs(sleepScheduleQuery);

        querySnapshot.getISO = () => {
            return ISO;
        };

        promiseList.push(querySnapshot);
        monthIndex = monthIndex.plus({ day: 1 });
    }
    
    Promise.all(promiseList).then((responses) => {
        var currentDate;
        var datas = {};
        var i = 0;

        responses.forEach(snapshot => {
            let ISO = promiseList[i].getISO();
            if (!snapshot.empty) {
                snapshot.forEach((doc) => 
                    datas = doc.data()
                );

                currentDate = {
                    uid: user.uid, 
                    dateTime: monthIndex,
                    ISO: ISO,
                    sleep_time: datas.sleep_time,
                    wake_time: datas.wake_time
                };
            } else {
                currentDate = {
                    uid: user.uid, 
                    dateTime: monthIndex,
                    ISO: ISO,
                    sleep_time: "sleep",
                    wake_time: "wake"
                };
            }
            i++;
            dateList.push(currentDate);
        });

        // promiseList.forEach(promise => {
        //     promise.then((snapshot) => {
        //         if (!snapshot.empty) {
                    
        //             snapshot.forEach((doc) => 
        //                 datas = doc.data()
        //             );
    
        //             currentDate = {
        //                 uid: user.uid, 
        //                 dateTime: monthIndex,
        //                 ISO: promise.getISO(),
        //                 sleep_time: datas.sleep_time,
        //                 wake_time: datas.wake_time
        //             };
        //         } else {
        //             currentDate = {
        //                 uid: user.uid, 
        //                 dateTime: monthIndex,
        //                 ISO: promise.getISO(),
        //                 sleep_time: "sleep",
        //                 wake_time: "wake"
        //             };
        //         }
        //         // console.log(currentDate);
        //         dateList.push(currentDate);
        //     });
        // });
        console.log(dateList);
    });
}