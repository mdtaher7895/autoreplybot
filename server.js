const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// আপনার পছন্দমতো একটি সিক্রেট টোকেন দিন (এটি ফেসবুক ডেভেলপার পেজেও দিতে হবে)
const VERBOSE_TOKEN = "my_secure_token_123";
const GEMINI_API_KEY = "আপনার_জেমিনি_এপিআই_কি_এখানে_বসাবেন"; 

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

            // যদি ইউজারের পক্ষ থেকে কোনো টেক্সট মেসেজ আসে
            if (webhookEvent.message && webhookEvent.message.text) {
                const userText = webhookEvent.message.text;
                
                // জেমিনি এআই থেকে উত্তর নিয়ে আসা
                const aiReply = await getGeminiResponse(userText);
                
                // মেসেঞ্জারে উত্তর পাঠিয়ে দেওয়া
                callSendAPI(senderPsid, aiReply);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// জেমিনি এআই ফাংশন
async function getGeminiResponse(promptText) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: promptText }] }]
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Error:", error);
        return "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।";
    }
}

// মেসেঞ্জার সেন্ড এপিআই ফাংশন
function callSendAPI(senderPsid, responseText) {
    const PAGE_ACCESS_TOKEN = "আপনার_ফেসবুক_পেইজ_অ্যাক্সেস_টোকেন_এখানে_বসাবেন";
    const requestBody = {
        recipient: { id: senderPsid },
        message: { text: responseText }
    };

    axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
        .catch(error => console.error("Messenger Send Error:", error));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
