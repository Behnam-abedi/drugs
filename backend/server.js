// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // ماژول path برای کار با مسیرها

const app = express();
// برای سازگاری با لیارا، پورت را از متغیرهای محیطی می‌خوانیم
const PORT = process.env.PORT || 3000; 

app.use(cors());

// --- بخش کلیدی: سرو کردن فایل‌های فرانت‌اند ---
// به اکسپرس می‌گوییم که پوشه frontend حاوی فایل‌های استاتیک است
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
// ---------------------------------------------


// اندپوینت برای گرفتن لیست پیشنهادی داروها
app.get('/api/autocomplete', async (req, res) => {
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

// اجرای سرور
app.listen(PORT, () => {
    console.log(`✅ Backend server for Negin is running at http://localhost:${PORT}`);
});