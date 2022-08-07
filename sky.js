const skyContainer = document.getElementById("sky-effects");
const switchBtn = document.getElementById("switch-mode");
const switchSvg = document.getElementById("switch-svg");

const darkSVG  = "/assets/icons/dark_mode_FILL0_wght400_GRAD0_opsz48.svg" //TODO Fix the img in production see https://vitejs.dev/guide/assets.html
const lightSVG  = "/assets/icons/light_mode_FILL0_wght400_GRAD0_opsz48.svg"

let currentMode = "dark";

switchBtn.onclick = () => {
    if (currentMode === "dark") {
        setLightMode()
        currentMode = "light"
    } else {
        setDarkMode()
        currentMode = "dark"
    }
}

initStars();

function setDarkMode() {
    document.body.classList.remove("light");
    document.body.classList.add("dark");
    initStars();

    switchSvg.src = darkSVG;
}

function setLightMode() {
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    clearStars();
    
    switchSvg.src = lightSVG;
}

/**
 * Create {window.innerWidth / 10} starts randomly placed 
 */
function initStars() {
    let count = window.innerWidth / 10;

    for (let i = 0; i < count; i++) {
        let star = document.createElement("i");
        let x = Math.floor(Math.random() * 100);
        let y = Math.floor(Math.random() * 100);
        let size = Math.random() * 2;

        star.style.left = x + "%";
        star.style.top = y + "%";
        star.style.width = 1 + size + "px";
        star.style.height = 1 + size + "px";
        star.classList.add("stars");

        skyContainer.appendChild(star);
    }
}

/**
 * Remove all the stars
 */
function clearStars() {
    skyContainer.innerHTML = '';
}