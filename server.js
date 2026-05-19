// server.js - Vercel Optimized Version
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// ===== CRITICAL: Get API key from Vercel environment =====
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

// Debug logging (check Vercel logs to see this)
console.log('========================================');
console.log('🚀 Lumina Server Starting on Vercel');
console.log('========================================');
console.log(`🔑 API_KEY exists: ${!!API_KEY}`);
console.log(`🔑 API_KEY length: ${API_KEY ? API_KEY.length : 0}`);
console.log(`🤖 Model: ${MODEL_NAME}`);
console.log(`🌍 Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
console.log('========================================\n');

if (!API_KEY) {
    console.error('❌ CRITICAL: GEMINI_API_KEY is NOT set in Vercel environment variables!');
    console.error('   Please add it in: Vercel Dashboard → Project Settings → Environment Variables');
}

// Initialize Gemini
let model = null;
if (API_KEY) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: MODEL_NAME });
        console.log('✅ Gemini initialized successfully\n');
    } catch (error) {
        console.error('❌ Gemini init failed:', error.message);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        model: MODEL_NAME,
        apiKeyConfigured: !!API_KEY,
        platform: 'vercel',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    console.log('🧪 Test endpoint called');
    
    if (!API_KEY) {
        return res.status(500).json({ 
            success: false, 
            error: 'GEMINI_API_KEY not configured in Vercel. Please add it in Project Settings → Environment Variables' 
        });
    }
    
    if (!model) {
        return res.status(500).json({ 
            success: false, 
            error: 'Gemini model not initialized' 
        });
    }
    
    try {
        const result = await model.generateContent("Say 'Lumina is working perfectly on Vercel!'");
        const response = await result.response;
        const text = response.text();
        console.log('✅ Test successful:', text);
        res.json({ success: true, message: text });
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    console.log('📨 Chat request received');
    
    if (!API_KEY) {
        return res.status(500).json({ 
            response: '❌ **Configuration Error**\n\nGEMINI_API_KEY is not set in Vercel.\n\n**Fix:**\n1. Go to Vercel Dashboard\n2. Project Settings → Environment Variables\n3. Add `GEMINI_API_KEY` with your API key\n4. Redeploy the project',
            error: true 
        });
    }
    
    if (!model) {
        return res.status(500).json({ 
            response: '❌ **Model Error**\n\nGemini model failed to initialize. Check server logs.',
            error: true 
        });
    }
    
    try {
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }
        
        console.log(`💬 User: ${message.substring(0, 50)}`);
        
        let prompt = message;
        if (history && history.length > 0) {
            const recentHistory = history.slice(-3);
            const context = recentHistory.map(h => 
                `User: ${h.user}\nAssistant: ${h.bot}`
            ).join('\n\n');
            prompt = `Previous conversation:\n${context}\n\nUser: ${message}\n\nAssistant:`;
        }
        
        console.log('🤖 Calling Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Response: ${text.length} chars`);
        res.json({ response: text, model: MODEL_NAME });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ 
            response: `❌ **Error:** ${error.message}`,
            error: true
        });
    }
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

// For local development only
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Local server running at http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless function
module.exports = app;