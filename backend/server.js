// server.js (نسخه نهایی با سیستم دیباگینگ)

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

// این دو خط باید حتما در بالای کد و قبل از تعریف مسیرها باشند
app.use(cors());
app.use(express.json()); // این خط برای خواندن JSON از بدنه درخواست ضروری است

// --- مرحله ۱: تعریف تمام مسیرهای API ---

// اندپوینت برای گرفتن لیست پیشنهادی داروها
app.get('/api/autocomplete', async (req, res) => {
    // ... این بخش بدون تغییر است ...
    const { s } = req.query;
    if (!s) {
        return res.status(400).send({ error: 'Search query "s" is required.' });
    }
    const targetUrl = `https://www.drugs.com/api/autocomplete/?type=interaction&s=${s}`;
    try {
        const response = await axios.get(targetUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching autocomplete data:', error.message);
        res.status(500).send({ error: 'Failed to fetch autocomplete data.' });
    }
});

// اندپوینت برای دریافت درخواست تداخل دارویی
app.get('/api/check-interactions', async (req, res) => {
    // ... این بخش بدون تغییر است ...
    const { drug_list } = req.query;
    if (!drug_list) {
        return res.status(400).send({ error: 'drug_list parameter is required.' });
    }
    const targetUrl = `https://www.drugs.com/interactions-check.php?drug_list=${drug_list}`;
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error fetching interaction data from drugs.com:', error.message);
        res.status(500).send({ error: 'Failed to fetch data from the external source.' });
    }
});

// --- اندپوینت جدید برای n8n با سیستم دیباگینگ ---
app.post('/api/summarize', async (req, res) => {
    console.log('\n--- [DEBUG] ---');
    console.log('1. Received request on /api/summarize endpoint.');

    const { reportText } = req.body; 

    if (!reportText || reportText.trim() === '') {
        console.error('2. [ERROR] Report text is empty or missing.');
        return res.status(400).send({ error: 'Report text is required.' });
    }
    
    console.log('2. Report text received successfully. Length:', reportText.length);

    const N8N_WEBHOOK_URL = 'https://drugs-intraction.app.n8n.cloud/webhook/517bdaf0-55c2-42e2-8c51-fd432ca7d1c4';
    
    try {
        console.log(`3. Attempting to send POST request to n8n webhook: ${N8N_WEBHOOK_URL}`);
        
        const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
            reportText: reportText 
        });

        console.log('4. [SUCCESS] Received response from n8n.');
        console.log('5. Sending summarized data back to frontend.');
        res.json(n8nResponse.data);

    } catch (error) {
        console.error('4. [FATAL ERROR] Failed to communicate with n8n.');
        
        // نمایش جزئیات کامل خطا برای دیباگ
        if (error.response) {
            // سرور n8n پاسخ داده اما با کد خطا (مثلا 404, 500)
            console.error('   - Status:', error.response.status);
            console.error('   - Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // درخواست ارسال شده اما پاسخی دریافت نشده (مشکل شبکه یا آدرس غلط)
            console.error('   - No response received. Check network or n8n webhook URL.');
        } else {
            // خطای کلی در هنگام ساخت درخواست
            console.error('   - Error Message:', error.message);
        }
        
        res.status(500).send({ error: 'Failed to get summary from AI service.' });
    }
    console.log('--- [END DEBUG] ---\n');
});


// --- سرو کردن فایل‌های استاتیک فرانت‌اند (بعد از API ها) ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// خط کد مشکل‌ساز app.get('/*') به طور کامل حذف شده است.

// اجرای سرور
app.listen(PORT, () => {
    console.log(`✅ Backend server for Negin is running at http://localhost:${PORT}`);
});