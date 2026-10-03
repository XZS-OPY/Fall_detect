// ============================================================
//  用药模块
// ============================================================

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const addProgress = document.getElementById("addProgress");

let progress = 30;

function updateProgressUI() {
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;
}

function initMedicine() {
    updateProgressUI();

    if (addProgress) {
        addProgress.addEventListener("click", () => {
            progress += 10;
            if (progress > 100) progress = 100;
            updateProgressUI();
        });
    }
}