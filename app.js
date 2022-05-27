import './assets/css/style.css'
import './assets/css/tiny-slider.css'
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, query, where, getDocs} from "firebase/firestore";
import { DateTime } from "luxon";
import { tns } from "tiny-slider";


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
const selectHourOfSleep = document.getElementById('select_hour_of_sleep');
const sleepingScheduleList = document.getElementById('sleeping_schedule');
const inputScheduleSleepTime = document.getElementById('input_schedule_sleep_time');
const inputScheduleWakeTime = document.getElementById('input_schedule_wake_time');
const validateScheduleHoursBtn = document.getElementById('validate_schedule_btn');
const previousBtn = document.getElementById('previous_btn');
const nextBtn = document.getElementById('next_btn');

signInBtn.onclick = () => signInWithPopup(auth, provider).catch((error) => console.log('error'));
signOutBtn.onclick = () => signOut(auth);

let user;
let unsubscribe;

let dateList = [];
let currentDateIndex = null;


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
            week_sleep_time : formateHourField(inputWeekSleepTime.value),
            week_wake_time : formateHourField(inputWeekWakeTime.value),
            weekend_sleep_time : formateHourField(inputWeekendSleepTime.value),
            weekend_wake_time : formateHourField(inputWeekendWakeTime.value),
            hour_of_sleep : validateHourSleepNeeded(selectHourOfSleep.value),
        });
        console.log("Users settings has been saved for user : ", user.displayName);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

inputScheduleSleepTime.addEventListener("change", dateHourChanged);
inputScheduleWakeTime.addEventListener("change", dateHourChanged);
validateScheduleHoursBtn.addEventListener("click", saveDateList);//TODO Find a way to save one if unfocused AND if the 4th number changed (not each time)
previousBtn.addEventListener("click", previousDate);//TODO move the slider with the current 
nextBtn.addEventListener("click", nextDate);

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
            selectHourOfSleep.value = validateHourSleepNeeded(settingsData.hour_of_sleep);
        } else {
            inputWeekSleepTime.value = "00:00";
            inputWeekWakeTime.value = "00:00";
            inputWeekendSleepTime.value = "00:00"
            inputWeekendWakeTime.value = "00:00";
            selectHourOfSleep.value = "7";
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
function formateHourField(value) {
    if (value ==  undefined || value == "") {
        return "0000";
    } else  {
        return value.replace(":", "");
    }
}

/**
 * Validate if the value passed in parameter is at the format HH:mm
 * 
 * @param {String} value 
 * @returns Bool
 */
function validateHourField(value) {
    let regex = /^0[0-9]|1[0-9]|2[0-3]:[0-5][0-9] to 0[0-9]|1[0-9]|2[0-3]:[0-5][0-9]$/;
    return regex.test(value);
}

/**
 * Validate if the value passed in parameter is in the ["6", "7", "8"], if true return the value else return "7" (default value)
 * 
 * @param {String} value 
 * @returns String
 */
function validateHourSleepNeeded(value) {
    let choices = ["6", "7", "8"];

    if (choices.includes(value)) {
        return value;
    } else {
        return "7";
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

/**
 * Init the date list beetween the last month and the next 15 days, with database value if found
 */
/* 
TODO Revoir toute la méthode :
TODO 1) récupérer TOUTES les données pour l'utilisateur courant
TODO Si il y a des données, utiliser la date la plus ancienne comme date de départ. Sinon date de départ = lastTwoWeek
TODO Boucle while jusqu'à aujourd'hui (+ x jour pour faire un multiple de 7)
*/
function initDateList() {
    let now = DateTime.now();
    let lastTwoWeek = DateTime.now().minus({day: 15});
    let tomorrow = DateTime.now().plus({day: 1});
    let lastMonth = DateTime.now().minus({ month: 1 });//TODO Utiliser ces dates la pour le calculs de la dettes de sommeil
    let monthIndex = lastTwoWeek;

    let promiseList = [];

    while (monthIndex.toLocaleString() !== tomorrow.toLocaleString()) {
        let ISO =  monthIndex.toISODate();
        let isDisplayed = (monthIndex >= lastTwoWeek);
        let isNow = (monthIndex.toISODate() == now.toISODate());

        let sleepScheduleCollection = collection(db, "sleep-schedule");
        let sleepScheduleQuery = query(sleepScheduleCollection, where("uid", "==", user.uid), where("ISO", "==", ISO));
        
        let querySnapshot = getDocs(sleepScheduleQuery);

        querySnapshot.getDisplayInformations = () => {
            return {
                ISO: ISO,
                isDisplayed: isDisplayed,
                isNow: isNow
            };
        };

        promiseList.push(querySnapshot); 
        monthIndex = monthIndex.plus({ day: 1 });
    }

    Promise.all(promiseList).then((responses) => {
        var currentDate;
        
        var i = 0;

        responses.forEach(snapshot => {
            let datas = {};
            let displayInformations = promiseList[i].getDisplayInformations();
            if (!snapshot.empty) {
                snapshot.forEach((doc) =>{
                        datas = doc.data();
                        datas.id = doc.id;
                    }
                );
                currentDate = {
                    dbId: datas.id,
                    uid: user.uid,
                    dateTime: monthIndex,
                    displayInformations: displayInformations,
                    sleep_time: datas.sleep_time,
                    wake_time: datas.wake_time,
                    asChanged: false,
                };
            } else {
                currentDate = {
                    dbId: undefined,
                    uid: user.uid,
                    dateTime: monthIndex,
                    displayInformations: displayInformations,
                    sleep_time: "00:00",
                    wake_time: "00:00",
                    asChanged: false,
                };
            }
            i++;
            dateList.push(currentDate);
        });

        displayDateList();
    });
}

/**
 * Display the date list
 */
function displayDateList() {
    var i = 0;

    /**
     * Create the list of li 
     */
    dateList.forEach(date => { //TODO append by group of 7
        if (date.displayInformations.isDisplayed) {
            var div = document.createElement("div");
            var a = document.createElement("a");
            a.innerHTML = date.displayInformations.ISO;
            
            div.classList.add("date");
            div.classList.add(i);

            if ((currentDateIndex == null && date.displayInformations.isNow) || i == currentDateIndex) {
                if (currentDateIndex == null) {
                    currentDateIndex = i;
                }
            }

            div.appendChild(a);
            sleepingScheduleList.appendChild(div);

            i++;
        }
    });

    let slider = tns({ //TODO maybe move this to be global
        container: "#sleeping_schedule",
        loop: false,
        items: 7,
        //TODO add startIndex
        mouseDrag: true,
        slideBy: "page",
        swipeAngle: false,
        speed: 400
    });

    selectDate(currentDateIndex);
}

/**
 * Save all the date in database if changed
 */
function saveDateList() {
    dateList.forEach((date) => {
        if (date.asChanged && validateHourField(date.sleep_time) && validateHourField(date.wake_time)) {
            try {
                if (date.dbId != undefined) {
                    setDoc(doc(db, "sleep-schedule", date.dbId), {
                        uid: user.uid,
                        ISO: date.displayInformations.ISO,
                        sleep_time: date.sleep_time,
                        wake_time: date.wake_time,
                    });
                } else {
                    addDoc(collection(db, "sleep-schedule"), {
                        uid: user.uid,
                        ISO: date.displayInformations.ISO,
                        sleep_time: date.sleep_time,
                        wake_time: date.wake_time,
                    });
                }
            } catch (e) {
                console.error("Error adding document: ", e);
            }
            date.asChanged = false;
        }
    });
}

/**
 * Select the date ate the index in parameter and display it 
 * 
 * @param {int} index 
 */
function selectDate(index) {

    //Remove all class current 
    let currents = document.getElementsByClassName("date current")
    Array.prototype.forEach.call(currents, (el) => {
        el.classList.remove("current");
    });

    //Add the class "current" for the current date
    let currentLi = document.getElementsByClassName("date " + index)[0];
    currentLi.classList.add("current");

    /**
     * Display the sleep and wake time for the current date
     */
    let sleep_time = dateList[currentDateIndex].sleep_time;
    let wake_time = dateList[currentDateIndex].wake_time;

    if (validateHourField(sleep_time)) {
        inputScheduleSleepTime.value = dateList[currentDateIndex].sleep_time;
    } else  {
        inputScheduleSleepTime.value = null;
        inputScheduleSleepTime.style.color = "red";
    }

    if (validateHourField(wake_time)) {
        inputScheduleWakeTime.value = dateList[currentDateIndex].wake_time;
    } else  {
        inputScheduleWakeTime.value = null;
        inputScheduleWakeTime.style.color = "red";
    }
}

/**
 * Change the current date for the previous one
 */
function previousDate() {
    if (currentDateIndex > 0) {
        currentDateIndex--;

        selectDate(currentDateIndex);
    }
}

/**
 * Change the current date for the next one
 */
function nextDate() {
    if (currentDateIndex < dateList.length - 1) {
        currentDateIndex++;

        selectDate(currentDateIndex);
    }
}

/**
 * Set the asChanged value as true and the values from inputs for the current date
 */
function dateHourChanged() {
    let currentDate = dateList[currentDateIndex];
    currentDate.sleep_time = inputScheduleSleepTime.value;
    currentDate.wake_time = inputScheduleWakeTime.value;
    currentDate.asChanged = true;
}