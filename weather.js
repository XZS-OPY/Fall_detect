// ============================================================
//  天气模块


// 获取API配置
const API_KEY = (
    window.__QWEATHER_API_KEY__ ||
    getStoredString(CONFIG.STORAGE_KEYS.WEATHER_API_KEY, CONFIG.WEATHER.DEFAULT_API_KEY) ||
    CONFIG.WEATHER.DEFAULT_API_KEY
).trim();

const API_HOST = (
    window.__QWEATHER_API_HOST__ ||
    getStoredString(CONFIG.STORAGE_KEYS.WEATHER_API_HOST, CONFIG.WEATHER.DEFAULT_API_HOST) ||
    CONFIG.WEATHER.DEFAULT_API_HOST
).trim();


// 状态
let currentLocation = null;
let weatherRequestId = 0;
let citySearchTimer = null;

// ============================================================
//  工具函数
// ============================================================

function setWeatherStatus(message, isError = false) {
    if (!weatherStatus) return;
    weatherStatus.textContent = message;
    weatherStatus.style.color = isError ? "#e55353" : "";
}

function clearWeatherDisplay() {
    if (weatherTemp) weatherTemp.textContent = "--";
    if (weatherText) weatherText.textContent = "加载中";
    if (weatherHumidity) weatherHumidity.textContent = "-- %";
    if (weatherWind) weatherWind.textContent = "-- km/h";
    if (weatherFeelsLike) weatherFeelsLike.textContent = "-- °C";
}

function isApiConfigured() {
    if (!API_KEY || API_KEY.trim() === "" || API_KEY === "这里填写你的和风天气API_KEY") {
        setWeatherStatus("请先在 app.js 中填写 API Key", true);
        return false;
    }
    if (!API_HOST || API_HOST.trim() === "") {
        setWeatherStatus("API Host 未配置", true);
        return false;
    }
    return true;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ============================================================
//  核心API函数
// ============================================================

async function qweatherRequest(path, params = {}) {
    if (!isApiConfigured()) {
        throw new Error("天气 API 尚未配置");
    }

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
        }
    });

    const url = `https://${API_HOST}${path}?${query.toString()}`;
    console.log("API 请求：", url);

    const response = await fetch(url, {
        method: "GET",
        headers: { "X-QW-Api-Key": API_KEY }
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`服务器返回的数据无法解析，HTTP ${response.status}`);
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}，API code：${data.code || "unknown"}`);
    }

    return data;
}

// ============================================================
//  城市搜索
// ============================================================

async function searchCity(cityName) {
    const name = String(cityName || "").trim();
    if (!name) return [];
    if (!isApiConfigured()) return [];

    try {
        setWeatherStatus(`正在搜索“${name}”...`);
        const data = await qweatherRequest("/geo/v2/city/lookup", {
            location: name,
            range: "cn",
            number: 20,
            lang: "zh"
        });

        if (data.code !== "200") {
            setWeatherStatus(`城市搜索失败：${data.code}`, true);
            return [];
        }

        if (!Array.isArray(data.location)) {
            setWeatherStatus("没有找到匹配的城市", true);
            return [];
        }

        return data.location;
    } catch (error) {
        console.error("城市搜索异常：", error);
        setWeatherStatus(`城市搜索失败：${error.message}`, true);
        return [];
    }
}

// ============================================================
//  城市选择UI
// ============================================================

function clearCityResults() {
    if (!cityResults) return;
    cityResults.innerHTML = "";
    cityResults.classList.add("hidden");
}

function showCityResults(locations) {
    if (!cityResults) return;
    cityResults.innerHTML = "";

    if (!locations || locations.length === 0) {
        const empty = document.createElement("div");
        empty.className = "city-result";
        empty.textContent = "没有找到匹配的城市";
        cityResults.appendChild(empty);
        cityResults.classList.remove("hidden");
        return;
    }

    locations.forEach(location => {
        const item = document.createElement("div");
        item.className = "city-result";
        const name = escapeHtml(location.name || "");
        const adm1 = escapeHtml(location.adm1 || "");
        const adm2 = escapeHtml(location.adm2 || "");

        item.innerHTML = `
            <strong>${name}</strong>
            <span>${adm1}${adm2 && adm2 !== adm1 ? ` · ${adm2}` : ""}</span>
        `;

        item.addEventListener("click", () => {
            selectLocation(location);
            clearCityResults();
        });

        cityResults.appendChild(item);
    });

    cityResults.classList.remove("hidden");
}

// ============================================================
//  城市保存与恢复
// ============================================================

function saveLocation(location) {
    if (!location) return;
    const data = {
        id: location.id,
        name: location.name,
        adm1: location.adm1,
        adm2: location.adm2,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        tz: location.tz,
        utcOffset: location.utcOffset,
        type: location.type
    };
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.WEATHER, JSON.stringify(data));
    } catch (error) {
        console.warn("保存城市失败：", error);
    }
}

function getSavedLocation() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.WEATHER);
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (error) {
        console.error("保存的城市数据损坏：", error);
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.WEATHER);
        } catch (removeError) {
            console.warn("清除损坏城市缓存失败：", removeError);
        }
        return null;
    }
}

function syncCityUI(location) {
    if (!location) return;
    if (cityInput) cityInput.value = location.name || "";
    if (settingCity) settingCity.textContent = location.name || "未选择";
    if (citySelect) {
        const option = Array.from(citySelect.options).find(opt => opt.value === location.name);
        citySelect.value = option ? location.name : "";
    }
    currentLocation = location;
}

// ============================================================
//  选择城市
// ============================================================

async function selectLocation(location) {
    if (!location) return;
    if (!location.id) {
        setWeatherStatus("城市数据无效", true);
        return;
    }

    console.log("用户选择城市：", location);
    syncCityUI(location);
    saveLocation(location);
    await loadWeather(location);
}

async function selectCityByName(cityName) {
    const name = String(cityName || "").trim();
    if (!name) {
        setWeatherStatus("请先选择或输入城市", true);
        return;
    }

    const locations = await searchCity(name);
    if (!locations || locations.length === 0) {
        setWeatherStatus(`没有找到“${name}”`, true);
        return;
    }

    if (locations.length === 1) {
        await selectLocation(locations[0]);
        return;
    }

    showCityResults(locations);
    setWeatherStatus("请从搜索结果中选择准确的城市");
}

// ============================================================
//  加载天气
// ============================================================

async function loadWeather(location) {
    if (!location || !location.id) {
        setWeatherStatus("城市信息无效", true);
        return;
    }

    const requestId = ++weatherRequestId;
    setWeatherStatus(`正在获取 ${location.name} 的实时天气...`);
    clearWeatherDisplay();

    try {
        const data = await qweatherRequest("/v7/weather/now", {
            location: location.id,
            lang: "zh",
            unit: "m"
        });

        if (requestId !== weatherRequestId) {
            console.warn("忽略旧天气请求结果");
            return;
        }

        if (data.code !== "200") {
            throw new Error(`天气 API 返回 code=${data.code}`);
        }
        if (!data.now) {
            throw new Error("天气 API 没有返回 now 数据");
        }

        const now = data.now;
        weatherTemp.textContent = now.temp ?? "--";
        weatherText.textContent = now.text ?? "--";
        weatherHumidity.textContent = `${now.humidity ?? "--"} %`;
        weatherWind.textContent = `${now.windSpeed ?? "--"} km/h`;
        weatherFeelsLike.textContent = `${now.feelsLike ?? "--"} °C`;
        weatherCity.textContent = `${location.name || "--"}${location.adm1 ? ` · ${location.adm1}` : ""}`;

        const updateDate = data.updateTime ? new Date(data.updateTime) : new Date();
        const updateTimeText = updateDate.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        weatherUpdateTime.textContent = `最后更新：${updateTimeText}`;

        saveLocation(location);
        setWeatherStatus(`${location.name} 实时天气更新成功`);
    } catch (error) {
        console.error("获取天气失败：", error);
        if (requestId !== weatherRequestId) return;

        weatherTemp.textContent = "--";
        weatherText.textContent = "获取失败";
        weatherHumidity.textContent = "-- %";
        weatherWind.textContent = "-- km/h";
        weatherFeelsLike.textContent = "-- °C";
        setWeatherStatus(`天气获取失败：${error.message}`, true);
    }
}

// ============================================================
//  恢复城市
// ============================================================

async function restoreCity() {
    const saved = getSavedLocation();
    if (saved && saved.id) {
        console.log("恢复上次城市：", saved);
        syncCityUI(saved);
        await loadWeather(saved);
        return;
    }

    console.log(`没有保存的城市，默认使用${CONFIG.DEFAULT_CITY}`);
    await selectCityByName(CONFIG.DEFAULT_CITY);
}

// ============================================================
//  清除城市
// ============================================================

function clearCity() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.WEATHER);
    currentLocation = null;
    if (cityInput) cityInput.value = "";
    if (citySelect) citySelect.value = "";
    if (settingCity) settingCity.textContent = "未选择";
    if (weatherTemp) weatherTemp.textContent = "--";
    if (weatherText) weatherText.textContent = "--";
    if (weatherCity) weatherCity.textContent = "--";
    if (weatherHumidity) weatherHumidity.textContent = "-- %";
    if (weatherWind) weatherWind.textContent = "-- km/h";
    if (weatherFeelsLike) weatherFeelsLike.textContent = "-- °C";
    if (weatherUpdateTime) weatherUpdateTime.textContent = "最后更新：--";
    setWeatherStatus("城市记录已清除");
}

// ============================================================
//  获取当前城市（供其他模块使用）
// ============================================================

function getCurrentLocation() {
    return currentLocation;
}

// ============================================================
//  初始化天气事件
// ============================================================

function initWeather() {
    // 城市输入框实时搜索
    if (cityInput) {
        cityInput.addEventListener("input", () => {
            const value = cityInput.value.trim();
            clearTimeout(citySearchTimer);
            if (!value) {
                clearCityResults();
                setWeatherStatus("请选择或输入城市");
                return;
            }
            citySearchTimer = setTimeout(async () => {
                const locations = await searchCity(value);
                if (locations.length) {
                    showCityResults(locations);
                    setWeatherStatus(`找到 ${locations.length} 个城市`);
                }
            }, 400);
        });

        cityInput.addEventListener("keydown", async event => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            clearTimeout(citySearchTimer);
            const city = cityInput.value.trim();
            if (!city) {
                setWeatherStatus("请输入城市名称", true);
                return;
            }
            await selectCityByName(city);
        });
    }

    // 下拉城市选择
    if (citySelect) {
        citySelect.addEventListener("change", async () => {
            const city = citySelect.value;
            if (!city) return;
            clearCityResults();
            await selectCityByName(city);
        });
    }

    // 点击查询
    if (setCityBtn) {
        setCityBtn.addEventListener("click", async () => {
            clearTimeout(citySearchTimer);
            const inputValue = cityInput ? cityInput.value.trim() : "";
            if (inputValue) {
                await selectCityByName(inputValue);
                return;
            }
            if (citySelect && citySelect.value) {
                await selectCityByName(citySelect.value);
                return;
            }
            setWeatherStatus("请选择或输入城市", true);
        });
    }

    // 刷新天气
    if (refreshWeatherBtn) {
        refreshWeatherBtn.addEventListener("click", async () => {
            if (currentLocation) {
                await loadWeather(currentLocation);
                return;
            }
            const saved = getSavedLocation();
            if (saved) {
                currentLocation = saved;
                await loadWeather(saved);
                return;
            }
            const inputValue = cityInput ? cityInput.value.trim() : "";
            if (inputValue) {
                await selectCityByName(inputValue);
                return;
            }
            setWeatherStatus("请先选择城市", true);
        });
    }

    // 清除城市
    if (clearCityBtn) {
        clearCityBtn.addEventListener("click", clearCity);
    }

    // 点击页面其他位置关闭城市结果
    document.addEventListener("click", event => {
        const target = event.target;
        if (cityResults && cityInput &&
            !cityResults.contains(target) && target !== cityInput) {
            clearCityResults();
        }
    });
}