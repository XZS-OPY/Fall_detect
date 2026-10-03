// ============================================================
//  配置文件
// ============================================================

const CONFIG = {
    DEFAULT_CITY: "杭州",
    STORAGE_KEYS: {
        WEATHER: "selectedCity",
        FONT: "fontSize",
        WEATHER_API_KEY: "weatherApiKey",
        WEATHER_API_HOST: "weatherApiHost",
        RECOG_HISTORY: "recogHistory"
    },
    WEATHER: {
        DEFAULT_API_KEY: "770a340ab2f8405c9569a3b213e5aaea",
        DEFAULT_API_HOST: "mv7aatw87p.re.qweatherapi.com"
    },
    OCR: {
        API_KEY: "iADJ2gntQo39H3HIe8s9YhAg",
        SECRET_KEY: "eI7ZNCt3N1FNUzuylVOpjLHKEO9lt6Df",
        TOKEN_URL: "https://aip.baidubce.com/oauth/2.0/token",
        OCR_URL: "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic"
    }
};

function getStoredString(key, fallback = "") {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch (error) {
        return fallback;
    }
}