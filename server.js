const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// আপনার পছন্দমতো একটি সিক্রেট টোকেন দিন (এটি ফেসবুক ডেভেলপার পেজেও দিতে হবে)
const VERBOSE_TOKEN = process.env.VERIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ১. ফেসবুক ওয়েবহুক ভেরিফিকেশন (GET Request)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERBOSE_TOKEN) {
        if (mode === 'subscribe') {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// ২. ফেসবুক থেকে মেসেজ রিসিভ এবং জেমিনি এআই-এর মাধ্যমে উত্তর পাঠানো (POST Request)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            const webhookEvent = entry.messaging[0];
            const senderPsid = webhookEvent.sender.id;

                        // যদি ইউজারের পক্ষ থেকে কোনো টেক্সট মেসেজ আসে (সাময়িকভাবে অটো-রিপ্লাই বন্ধ)
            if (webhookEvent.message && webhookEvent.message.text) {
                const userText = webhookEvent.message.text;
                console.log("Message received but auto-reply is temporarily turned off.");
                
                // অটো-রিপ্লাই পাঠানো বন্ধ রাখা হলো
                // const aiReply = await getGeminiResponse(userText);
                // callSendAPI(senderPsid, aiReply);
            }

        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// জেমিনি এআই ফাংশন (নতুন ও আপডেট করা অংশ)
async function getGeminiResponse(promptText) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: promptText }] }]
        });
        
        // জেমিনির সঠিক রেসপন্স স্ট্রাকচার চেক করে উত্তর রিটার্ন করা
        if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            return "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
        }
    } catch (error) {
        console.error("Gemini Error:", error.response ? error.response.data : error.message);
        return "এই মুহূর্তে উত্তর দিতে পারছি না।";
    }
}

// মেসেঞ্জার সেন্ড এপিআই ফাংশন
function callSendAPI(senderPsid, responseText) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const requestBody = {
        recipient: { id: senderPsid },
        message: { text: responseText }
    };

    axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
        .catch(error => console.error("Messenger Send Error:", error));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
