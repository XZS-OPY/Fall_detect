// ============================================================
//  时钟模块
// ============================================================



function updateClock() {
    const now = new Date();

    const timeText = now.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const dateText = now.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    });

    const hour = now.getHours();
    let greeting = "您好";

    if (hour < 6) greeting = "凌晨好";
    else if (hour < 12) greeting = "早上好";
    else if (hour < 18) greeting = "下午好";
    else greeting = "晚上好";

    if (clock) clock.textContent = timeText;
    if (date) date.textContent = dateText;
    if (welcomeTime) welcomeTime.textContent = greeting;
}

function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

// ✅ 关键：页面加载后启动
document.addEventListener("DOMContentLoaded", initClock);