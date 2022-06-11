import "./assets/css/style.css"
import "./assets/css/tiny-slider.css"
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, query, where, getDocs, orderBy} from "firebase/firestore";
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
const userDetails = document.getElementById("user_details");
const editUserSettings = document.getElementById("edit_user_settings");
const inputWeekSleepTime = document.getElementById("input_week_sleep_time");
const inputWeekWakeTime = document.getElementById("input_week_wake_time");
const inputWeekendSleepTime = document.getElementById("input_weekend_sleep_time");
const inputWeekendWakeTime = document.getElementById("input_weekend_wake_time");
const selectHourOfSleep = document.getElementById("select_hour_of_sleep");
const sleepingScheduleList = document.getElementById("sleeping_schedule");
const inputScheduleSleepTime = document.getElementById("input_schedule_sleep_time");
const inputScheduleWakeTime = document.getElementById("input_schedule_wake_time");
const validateScheduleHoursBtn = document.getElementById("validate_schedule_btn");
const previousBtn = document.getElementById("previous_btn");
const nextBtn = document.getElementById("next_btn");

signInBtn.onclick = () => signInWithPopup(auth, provider).catch((error) => console.error(error));
signOutBtn.onclick = () => {signOut(auth); location.reload()} //! Warning change if the reaload take too much ressources instead of using logoutUser()

let user;
let unsubscribe;

let dateList = [];
let currentDateIndex = null;
let sleepDept = 0;

let slider;

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
previousBtn.addEventListener("click", previousDate);
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
    // calculateSleepDept();
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
    inputScheduleSleepTime.value = "00:00";
    inputScheduleWakeTime.value = "00:00";
    dateList = [];
    sleepDept = 0;

    userDetails.replaceChildren();
    slider != undefined ? slider.destroy() : "";
    sleepingScheduleList.replaceChildren(); //TODO not working
}

/**
 * Hide the logged in section and show the logged out sessions
 */
function logoutUser() {
    user = null;
    whenSignedIn.hidden = true;
    whenSignedOut.hidden = false;

    resetUserSettings();
}

/**
 * Init the date list beetween the last month and the next 15 days, with database value if found
 */
function initDateList() {
    let now = DateTime.now();
    let lastTwoWeek = DateTime.now().minus({day: 15}).startOf("week");
    let monthIndex;

    let firebaseDatas = [];

    let sleepScheduleCollection = collection(db, "sleep-schedule");
    let sleepScheduleQuery = query(sleepScheduleCollection, where("uid", "==", user.uid), orderBy("ISO"));
    let querySnapshot = getDocs(sleepScheduleQuery);

    querySnapshot.then((response) => {
        let firstDate = false;
        response.forEach((doc) => {
            if (!firstDate) {
                firstDate = doc.data().ISO;
            }
            firebaseDatas[doc.data().ISO] = {id: doc.id, ...doc.data()};
        })

        if (response.empty) {
            monthIndex = lastTwoWeek;
        } else {
            let firstDatabaseDate = DateTime.fromISO(firebaseDatas[firstDate].ISO).startOf("week");

            if (firstDatabaseDate > lastTwoWeek) {
                monthIndex = lastTwoWeek;
            } else {
                monthIndex = firstDatabaseDate;
            }
        }

        let daysBetween = now.diff(monthIndex, "day").days;
        let endDate = monthIndex.plus({ day: roundUpToMultOf7(daysBetween)});

        while (monthIndex.toLocaleString() !== endDate.toLocaleString()) {
            let ISO =  monthIndex.toISODate();
            let isDisplayed = true;
            let isNow = (monthIndex.toISODate() == now.toISODate());

            let displayInformations = {
                    ISO: ISO,
                    isDisplayed: isDisplayed,
                    isNow: isNow
            };

            let currentDate;

            if (firebaseDatas[ISO] != undefined) {
                currentDate = {
                    dbId: firebaseDatas[ISO].id,
                    uid: user.uid,
                    dateTime: monthIndex,
                    displayInformations: {...displayInformations, inDatabase: true},
                    sleep_time: firebaseDatas[ISO].sleep_time,
                    wake_time: firebaseDatas[ISO].wake_time,
                    sleepingTime: getTimeBetweenHour(firebaseDatas[ISO].sleep_time, firebaseDatas[ISO].wake_time, true),
                    asChanged: false,
                };
            } else {
                currentDate = {
                    dbId: undefined,
                    uid: user.uid,
                    dateTime: monthIndex,
                    displayInformations: {...displayInformations, inDatabase: false},
                    sleep_time: "00:00",
                    wake_time: "00:00",
                    sleepingTime: undefined,
                    asChanged: false,
                };
            }
            
            dateList.push(currentDate);
            monthIndex = monthIndex.plus({ day: 1 });
        };

        displayDateList();
        calculateSleepDept();
    });
}

/**
 * Display the date list
 */
function displayDateList() {
    var i = 0;
    var groupDiv = document.createElement("div");
    var rowDiv = document.createElement("div");
    rowDiv.classList.add("row");
    groupDiv.appendChild(rowDiv);
    /**
     * Create the list of li 
     */
    dateList.forEach(date => {
        if (date.displayInformations.isDisplayed) {
            var div = document.createElement("div");
            var btn = document.createElement("button");
            btn.dataset.date = btn.innerHTML = date.displayInformations.ISO;

            btn.onclick = () => {
                goToDate(date.displayInformations.ISO);
            }

            div.classList.add("date");
            div.classList.add(i);

            if ((currentDateIndex == null && date.displayInformations.isNow) || i == currentDateIndex) {
                if (currentDateIndex == null) {
                    currentDateIndex = i;
                }
            }

            div.appendChild(btn);
            rowDiv.appendChild(div);
            if (!((i + 1) % 7)) {
                sleepingScheduleList.appendChild(groupDiv);
                groupDiv = document.createElement("div");
                rowDiv = document.createElement("div");
                rowDiv.classList.add("row");
                groupDiv.appendChild(rowDiv);
            }
            i++;
        }
    });

    /**
     * Tiny slider init
     */
    slider = tns({
        container: "#sleeping_schedule",
        loop: false,
        items: 1,
        startIndex: i / 7,
        mouseDrag: true,
        slideBy: "page",
        swipeAngle: false,
        speed: 400
    });

    selectDate(currentDateIndex);
}

/**
 * Calculate the sleep dept based on the dateList array's data
 * 
 * @see dateList
 * @see sleepDept
 */
function calculateSleepDept() { //TODO call this methoed each time you modify a date within the range of day for the calcul (in saveDateList())
    if (dateList == undefined || dateList.empty) return;

    let range = 7; //? Number of day used to calculate de sleep dept
    let now = DateTime.now();
    let startDate = DateTime.now().minus({day: range});
    let sleepCumul = {hours: 0, minutes: 0}; //TODO global
    let sleepGoal = (selectHourOfSleep.value ?? 7) * range; //TODO global
    //TODO add an indicator if you have enough data or not (maybe number of day with date, etc..)

    for (let i = getIndexByDate(startDate.toISODate()); i < getIndexByDate(now.plus({day: 1}).toISODate()); i++) {
        let currentDate = dateList[i];
        if (currentDate.sleepingTime != undefined) {
            sleepCumul.hours += currentDate.sleepingTime.hours;
            sleepCumul.minutes += currentDate.sleepingTime.minutes;

            if (sleepCumul.minutes > 59) {
                sleepCumul.hours += Math.floor(sleepCumul.minutes / 60);
                sleepCumul.minutes = sleepCumul.minutes % 60;
            }
        }
    }

    console.log(sleepCumul)
    console.log(sleepGoal)

    //TODO display sleep dept
    //TODO display informations if they're not enough data to calcul the sleep dept
    //TODO advice of the sleeping time for tonight.
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
    let sleep_time = dateList[index].sleep_time;
    let wake_time = dateList[index].wake_time;

    if (validateHourField(sleep_time)) {
        inputScheduleSleepTime.value = dateList[index].sleep_time;
    } else  {
        inputScheduleSleepTime.value = null;
        inputScheduleSleepTime.style.color = "red";
    }

    if (validateHourField(wake_time)) {
        inputScheduleWakeTime.value = dateList[index].wake_time;
    } else  {
        inputScheduleWakeTime.value = null;
        inputScheduleWakeTime.style.color = "red";
    }
}

/**
 * Change the current date for the previous one
 */
function previousDate() {
    slider.goTo(Math.ceil((currentDateIndex) / 7));
    if (currentDateIndex > 0) {
        currentDateIndex--;
        selectDate(currentDateIndex);

        if (Math.ceil((currentDateIndex + 1) / 7) != slider.getInfo().displayIndex) {
            slider.goTo("prev");
        }
    }

}

/**
 * Change the current date for the next one
 */
function nextDate() {
    slider.goTo(Math.ceil((currentDateIndex) / 7));
    if (currentDateIndex < dateList.length - 1) {
        currentDateIndex++;

        selectDate(currentDateIndex);
        if (Math.ceil((currentDateIndex + 1) / 7) != slider.getInfo().displayIndex) {
            slider.goTo("next");
        }
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

/**
 * Set the selected date and move the slider to the one passed in parameter 
 * 
 * @param {String} date 
 */
function goToDate(date) {
    let index = currentDateIndex = getIndexByDate(date);
    selectDate(index);
    slider.goTo(Math.ceil((currentDateIndex + 1) /7) - 1);
}

/**
 * Get the index of the dateList array by the ISO date in parameter
 * 
 * @param {String} date as ISO
 * @return {int} index
 * @see dateList
 */
function getIndexByDate(date) {
    for (let i = 0; i < dateList.length; i++) {
        if (dateList[i].displayInformations.ISO == date) {
            return i;
        }
    }

    return undefined;
}

/**
 * Round n up to the nearest multiple of 7 
 * 
 * @param {int} n number to round
 * @returns int
 */
function roundUpToMultOf7(n) {
    if(n > 0)
        return Math.ceil(n/7.0) * 7;
    else if( n < 0)
        return Math.floor(n/7.0) * 7;
    else
        return 7;
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
        return [hour.slice(0, 2), ":" , hour.slice(2)].join("");
    }
}

/**
 * Get the time between two different hour based on a classical sleeping schedule.
 * That's mean if the first hour is after noon, it will be consider as before midnight of yesterday.
 * 
 * @param {String} from at format HH:mm
 * @param {String} to at format HH:mm
 * @param {boolean} round true if you want the data rounded to the quarter
 * @return Object at format {hours: x, minutes: x}, undefined if (from === to)
 */
function getTimeBetweenHour(from, to, round = false) {
    if (from === to) return undefined

    if (round) {
        from = roundedQuaterly(from);
        to = roundedQuaterly(to);
    }

    from = from.split(":");
    to = to.split(":");


    let dateFrom = DateTime.fromISO("2000-01-04T" + from[0] + from[1]);
    let dateTo = DateTime.fromISO("2000-01-04T" + to[0] + to[1]);

    if (from[0] > 12) {
        dateFrom = dateFrom.minus({day: 1});
    } else if (from[0] >= to[0]) {
        dateTo = dateTo.plus({day: 1});
    }

    let dateDiff = dateTo.diff(dateFrom, ["hour", "minutes"]);

    return dateDiff.toObject()
}

/**
 * Get time (at format HH:mm) passed in parameter rounded to the nearest quarter
 * 
 * @param {String} time at format HH:mm
 * @return {String} 
 */
function roundedQuaterly(time) {
    time = time.split(":");
    let hour = time[0];
    let minutes = parseInt(time[1]);
    
    if (minutes > "52") {
        if (hour == "23") {
            return "00:00"
        } else {
            return (parseInt(hour) + 1) + ":00"
        }
    }

    let result = (parseInt((minutes + 7.5)/15) * 15) % 60

    return hour + ":" + (result == 0 ? "00" : result.toString());
}