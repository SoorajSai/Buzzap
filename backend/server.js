const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { 
    initializeWhatsAppClient, 
    getStatus, 
    sendBulkMessages, 
    pauseBroadcast, 
    resumeBroadcast, 
    stopBroadcast, 
    handleSocketDisconnect, 
    destroySession 
} = require('./whatsappClient');
const { checkAgreement, saveAgreement } = require('./database');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins for dev
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    const sessionId = socket.handshake.query.sessionId;
    if (!sessionId) {
        console.log('Client connected without sessionId. Disconnecting.');
        socket.disconnect();
        return;
    }
    
    console.log(`Client connected: ${socket.id} (Session: ${sessionId})`);
    
    // Initialize WA Client for this session
    initializeWhatsAppClient(sessionId, socket);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id} (Session: ${sessionId})`);
        handleSocketDisconnect(sessionId);
    });
});

// Middleware to extract sessionId from requests
function getSessionId(req, res, next) {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }
    req.sessionId = sessionId;
    next();
}

// API Endpoints
app.get('/api/status', getSessionId, (req, res) => {
    res.json(getStatus(req.sessionId));
});

app.post('/api/logout', getSessionId, async (req, res) => {
    await destroySession(req.sessionId);
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/agreement/:phone', async (req, res) => {
    try {
        const row = await checkAgreement(req.params.phone);
        if (row) {
            res.json({ agreed: true, agreedAt: row.agreedAt, updatedAt: row.updatedAt });
        } else {
            res.json({ agreed: false });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/agreement', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    
    try {
        await saveAgreement(phone);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/send', upload.single('image'), getSessionId, async (req, res) => {
    let numbers = [];
    try {
        numbers = JSON.parse(req.body.numbers);
    } catch (e) {
        return res.status(400).json({ error: 'Valid numbers array is required' });
    }
    
    const { message, minDelay, maxDelay } = req.body;
    const mediaPath = req.file ? req.file.path : null;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'Valid numbers array is required' });
    }

    if (!message && !mediaPath) {
        return res.status(400).json({ error: 'Message or Image is required' });
    }

    const stat = getStatus(req.sessionId);
    if (stat.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp is not ready. Please scan the QR code.' });
    }
    
    // Verify agreement
    if (!stat.user) {
        return res.status(400).json({ error: 'User identity not found. Reconnect.' });
    }
    try {
        const agreement = await checkAgreement(stat.user);
        if (!agreement) {
            return res.status(403).json({ error: 'Legal agreement not accepted.' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Failed to verify agreement.' });
    }

    // Enforce strictly 4000ms minimum delay (4 seconds)
    let actualMin = minDelay ? Math.max(Number(minDelay), 4000) : 4000;
    let actualMax = maxDelay ? Math.max(Number(maxDelay), actualMin) : Math.max(7000, actualMin);

    // Start sending process asynchronously so we don't block the HTTP request
    // Progress is emitted via WebSockets
    sendBulkMessages(req.sessionId, numbers, message, actualMin, actualMax, mediaPath).catch(err => {
        console.error(`[${req.sessionId}] Error during bulk send:`, err);
    });

    res.json({ success: true, message: 'Broadcast started successfully' });
});

app.post('/api/pause', getSessionId, (req, res) => {
    pauseBroadcast(req.sessionId);
    res.json({ success: true, message: 'Broadcast paused' });
});

app.post('/api/resume', getSessionId, (req, res) => {
    resumeBroadcast(req.sessionId);
    res.json({ success: true, message: 'Broadcast resumed' });
});

app.post('/api/stop', getSessionId, (req, res) => {
    stopBroadcast(req.sessionId);
    res.json({ success: true, message: 'Broadcast stopped' });
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
