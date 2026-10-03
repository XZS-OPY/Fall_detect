// ============================================================
//  OCR代理服务器
// ============================================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();


app.use(cors());
app.use(express.json({ limit: '50mb' }));


const BAIDU_CONFIG = {
    API_KEY: 'iADJ2gntQo39H3HIe8s9YhAg',
    SECRET_KEY: 'eI7ZNCt3N1FNUzuylVOpjLHKEO9lt6Df',
    TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token',
    OCR_URL: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'
};

console.log('📡 百度OCR配置:');
console.log('  TOKEN_URL:', BAIDU_CONFIG.TOKEN_URL);
console.log('  OCR_URL:', BAIDU_CONFIG.OCR_URL);

let accessToken = null;
let tokenExpireTime = 0;

// ============================================================
//  获取百度Token
// ============================================================

async function getBaiduAccessToken() {
    const now = Date.now();
    if (accessToken && now < tokenExpireTime - 300000) {
        console.log('✅ 使用缓存的Token');
        return accessToken;
    }

    try {
        console.log('🔄 正在获取百度Token...');
        
        const response = await axios.post(
            BAIDU_CONFIG.TOKEN_URL,
            null,
            {
                params: {
                    grant_type: 'client_credentials',
                    client_id: BAIDU_CONFIG.API_KEY,
                    client_secret: BAIDU_CONFIG.SECRET_KEY
                },
                timeout: 10000
            }
        );

        console.log('📥 Token响应:', response.status);

        if (!response.data.access_token) {
            console.error('❌ 响应中没有access_token:', response.data);
            throw new Error('未获取到access_token');
        }

        accessToken = response.data.access_token;
        tokenExpireTime = now + 3600000;
        
        console.log('✅ 百度Token获取成功');
        console.log('  Token:', accessToken.substring(0, 20) + '...');
        return accessToken;
    } catch (error) {
        console.error('❌ 获取百度Token失败:', error.message);
        if (error.response) {
            console.error('  响应数据:', error.response.data);
        }
        throw new Error('获取识别授权失败: ' + error.message);
    }
}

// ============================================================
//  OCR识别接口
// ============================================================

app.post('/api/ocr', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ 
                success: false,
                error: '缺少图片数据' 
            });
        }

app.get('/api/ocr/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok'
    });
});


        console.log('📸 收到OCR请求，图片大小:', (image.length / 1024).toFixed(2) + 'KB');

        // 获取百度Token
        const token = await getBaiduAccessToken();

        // 构建请求参数
        const params = new URLSearchParams();
        params.append('image', image);

        // 构建完整URL
        const ocrUrl = BAIDU_CONFIG.OCR_URL + '?access_token=' + encodeURIComponent(token);
        console.log('📡 调用百度OCR API:', BAIDU_CONFIG.OCR_URL);

        // 调用百度OCR API
        console.log('📤 发送识别请求...');
        const response = await axios.post(
            ocrUrl,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 60000
            }
        );

        console.log('📥 百度OCR响应状态:', response.status);

        // 检查百度OCR返回结果
        if (response.data.error_code) {
            console.error('❌ 百度OCR返回错误:', response.data);
            return res.status(400).json({
                success: false,
                error: response.data.error_msg || '识别失败',
                code: response.data.error_code
            });
        }

        const wordCount = response.data.words_result ? response.data.words_result.length : 0;
        console.log('✅ OCR识别成功，识别到', wordCount, '个词');
        
        // 直接返回百度OCR的原始数据
        res.json(response.data);

    } catch (error) {
        console.error('❌ OCR请求失败:', error.message);
        
        // 详细错误信息
        if (error.response) {
            console.error('  响应状态:', error.response.status);
            console.error('  响应数据:', error.response.data);
        }
        if (error.request) {
            console.error('  请求已发送但无响应');
        }
        
        // 处理超时错误
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                error: '识别超时，请稍后重试'
            });
        }
        
        res.status(500).json({
            success: false,
            error: '识别失败: ' + error.message
        });
    }
});

// ============================================================
//  健康检查接口
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'OCR代理服务运行正常'
    });
});

// ============================================================
//  启动服务器
// ============================================================

const PORT = 3000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log(' OCR代理服务已启动');
    console.log(' 服务运行中，按 Ctrl+C 停止');
});