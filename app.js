// ============================================================


// 天气相关
var citySelect = document.getElementById("citySelect");
var cityInput = document.getElementById("cityInput");
var setCityBtn = document.getElementById("setCityBtn");
var refreshWeatherBtn = document.getElementById("refreshWeatherBtn");
var cityResults = document.getElementById("cityResults");
var weatherStatus = document.getElementById("weatherStatus");
var weatherTemp = document.getElementById("weatherTemp");
var weatherText = document.getElementById("weatherText");
var weatherCity = document.getElementById("weatherCity");
var weatherUpdateTime = document.getElementById("weatherUpdateTime");
var weatherHumidity = document.getElementById("weatherHumidity");
var weatherWind = document.getElementById("weatherWind");
var weatherFeelsLike = document.getElementById("weatherFeelsLike");
var settingCity = document.getElementById("settingCity");
var clearCityBtn = document.getElementById("clearCityBtn");

// 时钟相关
var clock = document.getElementById("clock");
var date = document.getElementById("date");
var welcomeTime = document.getElementById("welcomeTime");

// OCR相关
var dropZone = document.getElementById('dropZone');
var fileInput = document.getElementById('fileInput');
var uploadBtn = document.getElementById('uploadBtn');
var cameraBtn = document.getElementById('cameraBtn');
var previewContainer = document.getElementById('previewContainer');
var previewImg = document.getElementById('previewImg');
var recognizeBtn = document.getElementById('recognizeBtn');
var clearImageBtn = document.getElementById('clearImageBtn');
var resultBox = document.getElementById('resultBox');
var copyResultBtn = document.getElementById('copyResultBtn');
var speakResultBtn = document.getElementById('speakResultBtn');
var clearResultBtn = document.getElementById('clearResultBtn');
var historyList = document.getElementById('historyList');
var recogCount = document.getElementById('recogCount');
var charCount = document.getElementById('charCount');
var autoSpeakCheck = document.getElementById('autoSpeakCheck');
var progressBar = document.getElementById('progressBar');
var cameraContainer = document.getElementById('cameraContainer');
var video = document.getElementById('video');
var captureBtn = document.getElementById('captureBtn');
var closeCameraBtn = document.getElementById('closeCameraBtn');

var voiceBtn = document.getElementById("voiceBtn");
var weatherTemp = document.getElementById("weatherTemp");
var weatherText = document.getElementById("weatherText");
var weatherHumidity = document.getElementById("weatherHumidity");
var weatherFeelsLike = document.getElementById("weatherFeelsLike");

console.log('✅ 所有DOM引用已加载');

// ============================================================
//  应用初始化
// ============================================================


async function loadMyRecords() {
        const content = document.getElementById('fallTableContainer');
        if (!content) return;

        try {
            const response = await fetch(`${API_BASE}/get_my_records.php`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn('API 返回状态:', response.status);
                showSampleData(content);
                return;
            }

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn('JSON 解析失败，使用示例数据');
                showSampleData(content);
                return;
            }

            if (data.code === 401) {
                currentView = 'login';
                isRendering = false;
                renderLogin();
                return;
            }

            if (data.code !== 200) {
                console.warn('API 返回错误:', data.error);
                showSampleData(content);
                return;
            }

            const records = data.data || [];
            const userInfo = data.user || currentUser || { username: '用户' };

            const displayUser = document.getElementById('displayUser');
            if (displayUser) {
                displayUser.textContent = userInfo.username + ' (ID: ' + (userInfo.id || '') + ')';
            }

            if (records.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">📭</div>
                        <div class="title">暂无记录</div>
                        <div class="sub">您还没有任何跌倒检测记录</div>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="dashboard-toolbar">
                    <div class="total-records">共 ${records.length} 条记录</div>
                    <button class="btn-secondary" onclick="location.reload()">🔄 刷新</button>
                </div>
                <div class="record-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>时间</th>
                                <th>位置</th>
                                <th>置信度</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            records.forEach(record => {
                const status = record.status || '未知';
                html += `
                    <tr>
                        <td>${escapeHtml(record.id)}</td>
                        <td>${escapeHtml(record.event_time)}</td>
                        <td>${escapeHtml(record.location)}</td>
                        <td>${record.confidence ? (parseFloat(record.confidence) * 100).toFixed(0) + '%' : '-'}</td>
                        <td><span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span></td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            content.innerHTML = html;

        } catch (error) {
            console.warn('加载异常，使用示例数据:', error);
            showSampleData(content);
        }
    }



async function initApp() {
    console.log("🚀 银发守护系统启动");

    try {
        // 初始化各模块
        if (typeof initClock === 'function') {
            initClock();
            console.log('✅ 时钟模块已初始化');
        }

        if (typeof initNavigation === 'function') {
            initNavigation();
            console.log('✅ 导航模块已初始化');
        }

        if (typeof initFont === 'function') {
            initFont();
            console.log('✅ 字体模块已初始化');
        }

        if (typeof initMedicine === 'function') {
            initMedicine();
            console.log('✅ 用药模块已初始化');
        }

        if (typeof initVoice === 'function') {
            initVoice();
            console.log('✅ 语音模块已初始化');
        }

        if (typeof initWeather === 'function') {
            initWeather();
            console.log('✅ 天气模块已初始化');
        }

        if (typeof initOCR === 'function') {
            initOCR();
            console.log('✅ OCR模块已初始化');
        }

        if (typeof restoreCity === 'function') {
            await restoreCity();
            console.log('✅ 城市已恢复');
        }

        console.log("🎉 所有模块加载完成！");
    } catch (error) {
        console.error('❌ 初始化失败：', error);
    }
}

// DOM加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
document.addEventListener('DOMContentLoaded', () => {
    loadMyRecords();
});