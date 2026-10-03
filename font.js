// ============================================================
//  字体模块
// ============================================================

const fontButtons = {
    small: document.getElementById("smallFontBtn"),
    medium: document.getElementById("mediumFontBtn"),
    large: document.getElementById("largeFontBtn"),
    xl: document.getElementById("xlFontBtn")
};

const fontPlus = document.getElementById("fontPlus");
const fontMinus = document.getElementById("fontMinus");

let currentFontScale = 1;

const scaleMap = {
    small: 0.90,
    medium: 1.00,
    large: 1.10,
    xl: 1.20
};

function setFontSize(size) {
    currentFontScale = scaleMap[size] || 1;
    document.documentElement.style.fontSize = `${currentFontScale}rem`;

    Object.values(fontButtons).forEach(button => {
        if (button) button.classList.remove("active");
    });

    if (fontButtons[size]) {
        fontButtons[size].classList.add("active");
    }

    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.FONT, size);
    } catch (error) {
        console.warn("保存字体设置失败：", error);
    }
}

function initFont() {
    // 字体按钮
    if (fontButtons.small) fontButtons.small.addEventListener("click", () => setFontSize("small"));
    if (fontButtons.medium) fontButtons.medium.addEventListener("click", () => setFontSize("medium"));
    if (fontButtons.large) fontButtons.large.addEventListener("click", () => setFontSize("large"));
    if (fontButtons.xl) fontButtons.xl.addEventListener("click", () => setFontSize("xl"));

    // 顶部A+ A-
    if (fontPlus) {
        fontPlus.addEventListener("click", () => {
            currentFontScale += 0.05;
            if (currentFontScale > 1.35) currentFontScale = 1.35;
            document.documentElement.style.fontSize = `${currentFontScale}rem`;
        });
    }

    if (fontMinus) {
        fontMinus.addEventListener("click", () => {
            currentFontScale -= 0.05;
            if (currentFontScale < 0.85) currentFontScale = 0.85;
            document.documentElement.style.fontSize = `${currentFontScale}rem`;
        });
    }

    // 恢复字体设置
    const savedFontSize = getStoredString(CONFIG.STORAGE_KEYS.FONT);
    if (savedFontSize) {
        setFontSize(savedFontSize);
    }
}