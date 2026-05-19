// server.js - Vercel compatible version
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

console.log('========== SERVER STARTING ==========');
console.log(`🔑 API Key exists: ${!!API_KEY}`);
console.log(`🤖 Model: ${MODEL_NAME}`);
console.log('=====================================\n');

if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
}

// Initialize Gemini
let genAI, model;
if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
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
            error: 'GEMINI_API_KEY not configured in Vercel environment variables' 
        });
    }
    
    try {
        const result = await model.generateContent("Say 'Lumina API is working perfectly on Vercel!'");
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
    console.log('\n📨 Chat request received');
    
    if (!API_KEY) {
        return res.status(500).json({ 
            response: '❌ **Configuration Error**\n\nGEMINI_API_KEY is not set in Vercel environment variables.\n\nPlease add it in: Project Settings → Environment Variables',
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

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log("=================================");
        console.log("🚀 Lumina Server Running Locally!");
        console.log(`📍 http://localhost:${PORT}`);
        console.log("=================================\n");
    });
}

// Export for Vercel
module.exports = app;