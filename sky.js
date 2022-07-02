const skyContainer = document.getElementById("sky-effects");
const switchBtn = document.getElementById("switch-mode");
const switchSvg = document.getElementById("switch-svg");

const darkSVG  = "/assets/icons/dark_mode_FILL0_wght400_GRAD0_opsz48.svg"
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

function setDarkMode() {
    document.body.classList.remove("light");
    document.body.classList.add("dark");

    switchSvg.src = darkSVG;
}

function setLightMode() {
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    
    switchSvg.src = lightSVG;
}