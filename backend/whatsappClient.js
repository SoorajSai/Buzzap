const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

// Map to store per-user sessions
const sessions = new Map();

// Helper to delay between messages
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            client: null,
            socket: null,
            qrCodeDataURL: null,
            status: 'disconnected', // 'disconnected', 'qr_ready', 'authenticated', 'ready'
            connectedUser: null,
            isPaused: false,
            isStopped: false,
            disconnectTimeout: null
        });
    }
    return sessions.get(sessionId);
}

function initializeWhatsAppClient(sessionId, socket) {
    const session = getSession(sessionId);
    session.socket = socket;

    // Cancel any pending destruction from a brief disconnect
    if (session.disconnectTimeout) {
        clearTimeout(session.disconnectTimeout);
        session.disconnectTimeout = null;
    }

    // If client already exists, just send the current status to the new socket
    if (session.client) {
        socket.emit('wa_status', { 
            status: session.status, 
            qrCode: session.qrCodeDataURL,
            user: session.connectedUser 
        });
        return;
    }

    // Initialize new ephemeral client (NoAuth)
    session.client = new Client({
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        },
        webVersionCache: {
            type: 'none'
        }
    });

    session.client.on('qr', async (qr) => {
        console.log(`[${sessionId}] QR RECEIVED`);
        session.status = 'qr_ready';
        try {
            session.qrCodeDataURL = await qrcode.toDataURL(qr);
            if (session.socket) {
                session.socket.emit('wa_status', { status: session.status, qrCode: session.qrCodeDataURL });
            }
        } catch (err) {
            console.error(`[${sessionId}] Error generating QR`, err);
        }
    });

    session.client.on('authenticated', () => {
        console.log(`[${sessionId}] AUTHENTICATED`);
        session.status = 'authenticated';
        session.qrCodeDataURL = null;
        if (session.socket) {
            session.socket.emit('wa_status', { status: session.status });
        }
    });

    session.client.on('auth_failure', msg => {
        console.error(`[${sessionId}] AUTH FAILURE`, msg);
        session.status = 'disconnected';
        if (session.socket) {
            session.socket.emit('wa_status', { status: session.status, error: msg });
        }
    });

    session.client.on('ready', () => {
        console.log(`[${sessionId}] READY`);
        session.status = 'ready';
        session.connectedUser = session.client.info && session.client.info.wid ? session.client.info.wid.user : null;
        if (session.socket) {
            session.socket.emit('wa_status', { status: session.status, user: session.connectedUser });
        }
    });

    session.client.on('disconnected', (reason) => {
        console.log(`[${sessionId}] Client was logged out`, reason);
        destroySession(sessionId);
    });

    session.client.initialize().catch(err => {
        console.error(`[${sessionId}] Initialization failed`, err);
        destroySession(sessionId);
    });
}

function handleSocketDisconnect(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    session.socket = null;
    
    // 10 second grace period for page reloads before destroying session
    session.disconnectTimeout = setTimeout(() => {
        console.log(`[${sessionId}] Session expired after socket disconnect`);
        destroySession(sessionId);
    }, 10000);
}

async function destroySession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    console.log(`[${sessionId}] Destroying session`);
    if (session.disconnectTimeout) {
        clearTimeout(session.disconnectTimeout);
    }
    
    if (session.client) {
        try {
            await session.client.destroy();
        } catch (err) {
            console.error(`[${sessionId}] Error destroying client:`, err);
        }
    }
    
    if (session.socket) {
        session.socket.emit('wa_status', { status: 'disconnected' });
    }
    
    sessions.delete(sessionId);
}

function getStatus(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return { status: 'disconnected', qrCode: null, user: null };
    return { status: session.status, qrCode: session.qrCodeDataURL, user: session.connectedUser };
}

async function sendBulkMessages(sessionId, numbers, messageTemplate, minDelayMs = 3000, maxDelayMs = 7000, mediaPaths = []) {
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'ready') {
        throw new Error('WhatsApp client is not ready');
    }

    let successCount = 0;
    let failedCount = 0;

    if (session.socket) session.socket.emit('broadcast_started', { total: numbers.length });
    session.isPaused = false;
    session.isStopped = false;

    for (let i = 0; i < numbers.length; i++) {
        if (session.isStopped) {
            console.log(`[${sessionId}] Broadcast stopped by user.`);
            if (session.socket) session.socket.emit('broadcast_progress', { status: 'stopped', remaining: numbers.length - i });
            break;
        }

        while (session.isPaused) {
            await delay(500);
            if (session.isStopped) break;
        }
        
        if (session.isStopped) {
            console.log(`[${sessionId}] Broadcast stopped by user during pause.`);
            if (session.socket) session.socket.emit('broadcast_progress', { status: 'stopped', remaining: numbers.length - i });
            break;
        }

        const contactObj = typeof numbers[i] === 'object' ? numbers[i] : { number: numbers[i], name: '' };
        const num = String(contactObj.number).replace(/\D/g, ''); 
        let formattedNum = num;
        if (formattedNum.length === 10) {
            formattedNum = '91' + formattedNum;
        } else if (formattedNum.startsWith('0') && formattedNum.length === 11) {
            formattedNum = '91' + formattedNum.substring(1);
        }
        
        try {
            const numberId = await session.client.getNumberId(formattedNum);
            if (!numberId) {
                throw new Error('Not registered on WhatsApp');
            }
            const chatId = numberId._serialized;
            if (mediaPaths && mediaPaths.length > 0) {
                // Send first image with text caption
                const media1 = MessageMedia.fromFilePath(mediaPaths[0]);
                const options = {};
                if (messageTemplate && messageTemplate.trim() !== '') {
                    options.caption = messageTemplate;
                }
                await session.client.sendMessage(chatId, media1, options);
                
                // Send second image if it exists
                if (mediaPaths.length > 1) {
                    const media2 = MessageMedia.fromFilePath(mediaPaths[1]);
                    await session.client.sendMessage(chatId, media2);
                }
            } else {
                // No images, just send text
                await session.client.sendMessage(chatId, messageTemplate);
            }

            successCount++;
            if (session.socket) session.socket.emit('broadcast_progress', { 
                index: i + 1, 
                total: numbers.length, 
                number: formattedNum, 
                name: contactObj.name,
                status: 'success' 
            });
            console.log(`[${sessionId}] Message sent to ${formattedNum}`);
        } catch (err) {
            console.error(`[${sessionId}] Failed to send to ${formattedNum}`, err);
            failedCount++;
            if (session.socket) session.socket.emit('broadcast_progress', { 
                index: i + 1, 
                total: numbers.length, 
                number: formattedNum, 
                name: contactObj.name,
                status: 'failed',
                error: err.message
            });
        }

        if (i < numbers.length - 1) {
            const currentDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1) + minDelayMs);
            await delay(currentDelay);
        }
    }

    if (session.socket) session.socket.emit('broadcast_completed', { successCount, failedCount, total: numbers.length });
    
    // Clean up uploaded files
    if (mediaPaths && Array.isArray(mediaPaths)) {
        mediaPaths.forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    }
    
    return { successCount, failedCount };
}

function pauseBroadcast(sessionId) {
    const session = sessions.get(sessionId);
    if (session) session.isPaused = true;
}

function resumeBroadcast(sessionId) {
    const session = sessions.get(sessionId);
    if (session) session.isPaused = false;
}

function stopBroadcast(sessionId) {
    const session = sessions.get(sessionId);
    if (session) session.isStopped = true;
}

module.exports = {
    initializeWhatsAppClient,
    getStatus,
    sendBulkMessages,
    pauseBroadcast,
    resumeBroadcast,
    stopBroadcast,
    handleSocketDisconnect,
    destroySession
};
