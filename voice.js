// ============================================================
//  语音模块
// ============================================================



function speakText(text) {
    if (!("speechSynthesis" in window)) {
        alert("当前浏览器不支持语音播放");
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function initVoice() {
    if (voiceBtn) {
        voiceBtn.addEventListener("click", () => {
            const loc = getCurrentLocation();
            if (loc) {
                const message = `${loc.name}当前天气是${weatherText.textContent}，温度${weatherTemp.textContent}摄氏度，湿度${weatherHumidity.textContent}，体感温度${weatherFeelsLike.textContent}。`;
                speakText(message);
            } else {
                speakText("您好，欢迎使用银发守护系统。");
            }
        });
    }
}
document.addEventListener("DOMContentLoaded", initVoice);