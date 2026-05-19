// server.js - Updated with CORRECT model names
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
// ✅ Using the CORRECT model name from your API
const MODEL_NAME = "gemini-2.5-flash";  // Latest and fastest!

console.log('\n========== SERVER STARTING ==========');
console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT FOUND'}`);
console.log(`🤖 Model: ${MODEL_NAME}`);
console.log('=====================================\n');

if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    console.error('   Create .env file with: GEMINI_API_KEY=your_key_here');
    process.exit(1);
}

// Initialize Gemini
let genAI, model;
try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log('✅ Gemini initialized successfully\n');
} catch (error) {
    console.error('❌ Failed to initialize Gemini:', error.message);
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Test endpoint to verify API works
app.get('/api/test', async (req, res) => {
    try {
        console.log('🧪 Testing Gemini API...');
        const result = await model.generateContent("Say 'Lumina is working perfectly with Gemini 2.5 Flash!'");
        const response = await result.response;
        const text = response.text();
        console.log('✅ Test successful:', text);
        res.json({ success: true, message: text, model: MODEL_NAME });
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            model: MODEL_NAME
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        model: MODEL_NAME,
        apiKeyConfigured: !!API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    const requestId = Date.now().toString().slice(-6);
    console.log(`\n[${requestId}] 📨 New message received`);
    
    try {
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }
        
        console.log(`[${requestId}] 💬 User: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);
        
        // Build prompt with conversation history
        let prompt = message;
        if (history && history.length > 0) {
            const recentHistory = history.slice(-5);
            const context = recentHistory.map(h => 
                `User: ${h.user}\nAssistant: ${h.bot}`
            ).join('\n\n');
            prompt = `Previous conversation:\n${context}\n\nUser: ${message}\n\nAssistant:`;
            console.log(`[${requestId}] 📚 Using ${recentHistory.length} previous messages for context`);
        }
        
        console.log(`[${requestId}] 🤖 Calling ${MODEL_NAME}...`);
        
        // Generate response with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout after 30s')), 30000)
        );
        
        const apiPromise = model.generateContent(prompt);
        const result = await Promise.race([apiPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        
        console.log(`[${requestId}] ✅ Response generated (${text.length} chars)`);
        
        res.json({ 
            response: text,
            model: MODEL_NAME,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`[${requestId}] ❌ Error:`, error.message);
        
        let userMessage = '';
        if (error.message.includes('API key') || error.message.includes('API_KEY')) {
            userMessage = '❌ **Invalid API Key**\n\nPlease check your GEMINI_API_KEY in the .env file.';
        } else if (error.message.includes('quota')) {
            userMessage = '📊 **Quota Exceeded**\n\nYou\'ve used your free quota. Try again later.';
        } else if (error.message.includes('timeout')) {
            userMessage = '⏰ **Request Timeout**\n\nThe AI is taking too long. Please try again.';
        } else {
            userMessage = `❌ **Error:** ${error.message}\n\nPlease try again.`;
        }
        
        res.status(500).json({ 
            response: userMessage,
            error: true,
            details: error.message
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log("=================================");
    console.log("🚀 Lumina Chat Server Running!");
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🤖 Model: ${MODEL_NAME}`);
    console.log("=================================");
    console.log("\n📋 Test the API:");
    console.log(`   → http://localhost:${PORT}/api/health`);
    console.log(`   → http://localhost:${PORT}/api/test`);
    console.log("=================================\n");
});