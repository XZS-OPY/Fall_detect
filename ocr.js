// ============================================================
//  OCR识别模块
// ============================================================

console.log('🔍 ocr.js 加载中...');



window.API_BASE_URL =  '/api';
var API_BASE_URL = window.API_BASE_URL;

console.log('📡 API_BASE_URL:', API_BASE_URL);
// ============================================================
//  状态
// ============================================================

var currentImageData = null;
var recognitionHistory = [];
var totalChars = 0;
var totalCount = 0;
var isRecognizing = false;
var stream = null;

// ============================================================
//  DOM引用
// ============================================================

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

console.log('📷 DOM元素检查:');
console.log('- uploadBtn:', uploadBtn ? '✅' : '❌');
console.log('- cameraBtn:', cameraBtn ? '✅' : '❌');
console.log('- recognizeBtn:', recognizeBtn ? '✅' : '❌');
console.log('- API_BASE_URL:', API_BASE_URL);

// ============================================================
//  工具函数
// ============================================================

function showToast(msg, duration) {
    duration = duration || 3000;
    var t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.classList.remove('show'); }, duration);
}

function formatTime(d) {
    return String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0') + ':' +
           String(d.getSeconds()).padStart(2, '0');
}

function showResult(text, isError) {
    if (!resultBox) return;
    if (isError) {
        resultBox.innerHTML = '<span style="color:#e55353;">❌ ' + text + '</span>';
        return;
    }
    if (!text || text.trim().length === 0) {
        resultBox.innerHTML = '<span class="result-empty">未识别到文字，请尝试更清晰的图片</span>';
        return;
    }
    resultBox.innerHTML = '<span class="result-text">' + text.replace(/\n/g, '<br>') + '</span>';
    addHistory(text);
    showToast('✅ 识别完成！共 ' + text.length + ' 个字符');
}

function showLoading() {
    if (!resultBox) return;
    resultBox.innerHTML = '<div class="loading"><span class="spinner"></span> 正在识别中，请稍候…</div>';
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    }
}

function showPlaceholder() {
    if (!resultBox) return;
    resultBox.innerHTML = '<span class="placeholder"> 上传图片后点击「开始识别」</span>';
}

function updateProgress(percent) {
    if (!progressBar) return;
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
}

// ============================================================
//  历史管理
// ============================================================

function loadHistory() {
    try {
        var data = JSON.parse(localStorage.getItem('recogHistory') || '[]');
        if (Array.isArray(data)) recognitionHistory = data;
    } catch (e) { recognitionHistory = []; }
    totalCount = recognitionHistory.length;
    totalChars = recognitionHistory.reduce(function(sum, item) {
        return sum + (item.text ? item.text.length : 0);
    }, 0);
    updateStats();
    renderHistory();
}

function saveHistory() {
    try {
        var limited = recognitionHistory.slice(-50);
        localStorage.setItem('recogHistory', JSON.stringify(limited));
    } catch (e) { /* ignore */ }
    totalCount = recognitionHistory.length;
    totalChars = recognitionHistory.reduce(function(sum, item) {
        return sum + (item.text ? item.text.length : 0);
    }, 0);
    updateStats();
    renderHistory();
}

function updateStats() {
    if (recogCount) recogCount.textContent = totalCount;
    if (charCount) charCount.textContent = totalChars;
}

function renderHistory() {
    if (!historyList) return;
    if (recognitionHistory.length === 0) {
        historyList.innerHTML = '<div class="recog-history-empty">暂无识别记录</div>';
        return;
    }
    var html = '';
    var items = recognitionHistory.slice(-20).reverse();
    items.forEach(function(item) {
        var timeStr = item.time || '--:--';
        var text = item.text || '(空)';
        var icon = item.icon || '📄';
        var displayText = text.length > 40 ? text.substring(0, 40) + '…' : text;
        html += '<div class="recog-history-item">' +
                '<span class="h-icon">' + icon + '</span>' +
                '<span class="h-time">' + timeStr + '</span>' +
                '<span class="h-text" title="' + text.replace(/"/g, '&quot;') + '">' + displayText + '</span>' +
                '</div>';
    });
    historyList.innerHTML = html;
}

function addHistory(text) {
    if (!text || text.trim().length === 0) return;
    var now = new Date();
    var timeStr = formatTime(now);
    recognitionHistory.push({
        text: text.trim(),
        time: timeStr,
        icon: '📝',
        timestamp: now.getTime()
    });
    saveHistory();
}

// ============================================================
//  图片加载
// ============================================================

function loadImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('⚠️ 请选择图片文件');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        currentImageData = e.target.result;
        if (previewImg) previewImg.src = currentImageData;
        if (previewContainer) previewContainer.classList.add('show');
        showPlaceholder();
        showToast('📷 图片已加载，点击「开始识别」');
    };
    reader.onerror = function() {
        showToast('⚠️ 读取图片失败');
    };
    reader.readAsDataURL(file);
}

// ============================================================
//  图片压缩
// ============================================================

function compressImage(imageDataUrl, maxWidth, maxHeight) {
    maxWidth = maxWidth || 1200;
    maxHeight = maxHeight || 1200;
    
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.onload = function() {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var width = img.width;
                var height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    var ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = function() {
            reject(new Error('图片加载失败'));
        };
        img.src = imageDataUrl;
    });
}

// ============================================================
//  通过代理服务器调用百度OCR
// ============================================================

async function recognizeWithProxy(imageDataUrl) {
    try {
        // 验证 API_BASE_URL
        if (!API_BASE_URL) {
            console.error('❌ API_BASE_URL 未定义');
            throw new Error('代理服务器地址未配置');
        }
        
        console.log('📡 代理服务器地址:', API_BASE_URL);
        
        // 1. 压缩图片
        console.log('🔄 正在压缩图片...');
        var compressedImage = await compressImage(imageDataUrl, 1200, 1200);
        
        // 2. 提取base64数据
        var base64Data = compressedImage.split(',')[1];
        if (!base64Data) {
            throw new Error('图片数据格式无效');
        }

        var sizeKB = (base64Data.length / 1024).toFixed(2);
        console.log('📤 压缩后图片大小:', sizeKB + 'KB');
        
        // 3. 构建完整URL
        var url = API_BASE_URL + '/ocr';
        console.log('📡 请求URL:', url);
        
        // 4. 调用代理服务器
        var response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Data
            })
        });

        console.log('📥 服务器响应状态:', response.status);

        if (!response.ok) {
            var errorData = await response.json();
            console.error('❌ 服务器返回错误:', errorData);
            throw new Error(errorData.error || '服务器返回错误: ' + response.status);
        }

        var result = await response.json();
        console.log('📥 识别结果:', result);
        
        // 检查是否有错误
        if (result.error_code) {
            throw new Error(result.error_msg || '识别失败');
        }
        
        // 检查是否有 words_result
        if (result.words_result) {
            return result;
        }
        
        // 检查是否有 data.words_result
        if (result.data && result.data.words_result) {
            return result.data;
        }
        
        // 如果没有识别到文字
        if (result.words_result_num === 0) {
            return { words_result: [] };
        }

        console.error('❌ 未知的响应格式:', result);
        throw new Error('识别结果格式异常');

    } catch (error) {
        console.error('❌ OCR识别错误:', error);
        throw error;
    }
}

// ============================================================
//  摄像头
// ============================================================

function startCamera() {
    console.log('📷 尝试打开摄像头...');
    
    if (stream) {
        if (cameraContainer) cameraContainer.classList.add('show');
        return;
    }

    var constraints = {
        video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(s) {
            console.log('✅ 摄像头已打开');
            stream = s;
            if (video) {
                video.srcObject = s;
                return video.play();
            }
        })
        .then(function() {
            if (cameraContainer) cameraContainer.classList.add('show');
            showToast('📷 摄像头已打开，点击「拍照」识别');
        })
        .catch(function(err) {
            console.error('❌ 摄像头错误:', err);
            if (err.name === 'NotAllowedError') {
                showToast('⚠️ 请允许浏览器访问摄像头权限', 3000);
            } else if (err.name === 'NotFoundError') {
                showToast('⚠️ 未找到摄像头设备', 3000);
            } else {
                showToast('⚠️ 无法打开摄像头：' + err.message, 3000);
            }
        });
}function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(function(t) { t.stop(); });
        stream = null;
        if (video) video.srcObject = null;
    }
    if (cameraContainer) cameraContainer.classList.remove('show');
}

// ============================================================
//  复制辅助函数
// ============================================================

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast('📋 已复制到剪贴板');
    } catch (e) {
        showToast('⚠️ 复制失败，请手动选择文字复制');
    }
    document.body.removeChild(ta);
}

// ============================================================
//  检查代理服务器状态
// ============================================================

function checkProxyServer() {
    var url = API_BASE_URL + '/health';
    console.log('🔍 检查代理服务器:', url);
    
    fetch(url)
        .then(function(response) {
            if (response.ok) {
                return response.json();
            }
            throw new Error('服务器响应异常');
        })
        .then(function(data) {
            console.log('✅ OCR代理服务器连接正常');
        })
        .catch(function(error) {
            console.warn('⚠️ OCR代理服务器未启动，请运行: node server.js');
            showToast('⚠️ 请先启动OCR代理服务器 (node server.js)', 5000);
        });
}

// ============================================================
//  初始化OCR
// ============================================================

function initOCR() {
    console.log('🔍 初始化OCR模块...');

    // 加载历史
    loadHistory();
    showPlaceholder();

    // 检查代理服务器
    setTimeout(checkProxyServer, 1000);

    // 上传按钮
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fileInput.click();
        });
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                loadImage(this.files[0]);
            }
            this.value = '';
        });
    }

    // 拖拽区域
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            var files = e.dataTransfer.files;
            if (files && files.length > 0) {
                loadImage(files[0]);
            }
        });
        dropZone.addEventListener('click', function(e) {
            if (e.target === uploadBtn || e.target === cameraBtn) return;
            if (fileInput) fileInput.click();
        });
    }

    // 摄像头
    if (cameraBtn) {
        cameraBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            startCamera();
        });
    }

    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', stopCamera);
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', function() {
            if (!stream || !video) return;

            var width = video.videoWidth || 640;
            var height = video.videoHeight || 480;

            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, width, height);

            var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            currentImageData = dataUrl;

            if (previewImg) previewImg.src = dataUrl;
            if (previewContainer) previewContainer.classList.add('show');

            stopCamera();
            showPlaceholder();
            showToast('📷 拍照成功，点击「开始识别」');
        });
    }

    // 识别按钮
    if (recognizeBtn) {
        recognizeBtn.addEventListener('click', async function() {
            if (isRecognizing) {
                showToast('⏳ 正在识别中，请稍候…');
                return;
            }

            if (!currentImageData) {
                showToast('⚠️ 请先上传或拍摄一张图片');
                return;
            }

            isRecognizing = true;
            this.disabled = true;
            this.textContent = '⏳ 识别中…';

            try {
                showLoading();
                updateProgress(10);

                showToast('🔍 正在识别文字…', 1000);
                var result = await recognizeWithProxy(currentImageData);
                updateProgress(90);

                console.log('📝 识别结果数据:', result);

                var text = '';
                if (result.words_result && result.words_result.length > 0) {
                    var texts = result.words_result.map(function(item) {
                        return item.words;
                    });
                    text = texts.join('\n');
                    console.log('📝 识别文字:', text);
                }

                updateProgress(100);

                if (text.trim().length === 0) {
                    showResult('未识别到文字', false);
                } else {
                    showResult(text, false);

                    if (autoSpeakCheck && autoSpeakCheck.checked) {
                        setTimeout(function() {
                            if (typeof speakText === 'function') {
                                speakText(text);
                            }
                        }, 500);
                    }
                }
            } catch (err) {
                console.error('❌ OCR error:', err);
                var errorMsg = err.message;
                if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
                    errorMsg = '无法连接识别服务，请确保代理服务器已启动 (node server.js)';
                } else if (errorMsg.includes('timeout')) {
                    errorMsg = '识别超时，请检查网络连接';
                } else if (errorMsg.includes('Invalid URL')) {
                    errorMsg = '代理服务器地址配置错误，请检查 API_BASE_URL';
                }
                showResult('识别失败：' + errorMsg, true);
                showToast('❌ 识别失败，请检查配置', 4000);
            } finally {
                isRecognizing = false;
                this.disabled = false;
                this.textContent = '🔍 开始识别';
                if (progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.textContent = '0%';
                }
            }
        });
    }

    // 清除图片
    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', function() {
            currentImageData = null;
            if (previewImg) previewImg.src = '';
            if (previewContainer) previewContainer.classList.remove('show');
            showPlaceholder();
            showToast('已清除图片');
        });
    }

    // 复制结果
    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', function() {
            if (!resultBox) return;
            var textEl = resultBox.querySelector('.result-text');
            if (!textEl) {
                showToast('⚠️ 没有可复制的内容');
                return;
            }
            var text = textEl.textContent || '';
            if (!text.trim()) {
                showToast('⚠️ 内容为空');
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(function() { showToast('📋 已复制到剪贴板'); })
                    .catch(function() { fallbackCopy(text); });
            } else {
                fallbackCopy(text);
            }
        });
    }

    // 朗读结果
    if (speakResultBtn) {
        speakResultBtn.addEventListener('click', function() {
            if (!resultBox) return;
            var textEl = resultBox.querySelector('.result-text');
            if (!textEl) {
                showToast('⚠️ 没有可朗读的内容');
                return;
            }
            var text = textEl.textContent || '';
            if (!text.trim()) {
                showToast('⚠️ 内容为空');
                return;
            }
            if (typeof speakText === 'function') {
                speakText(text);
            } else {
                showToast('⚠️ 语音功能不可用');
            }
        });
    }

    // 清空结果
    if (clearResultBtn) {
        clearResultBtn.addEventListener('click', function() {
            showPlaceholder();
            showToast('已清空结果');
        });
    }

    // 页面关闭时释放摄像头
    window.addEventListener('beforeunload', stopCamera);

    console.log('✅ OCR模块初始化完成');
}

console.log('✅ ocr.js 加载完成');