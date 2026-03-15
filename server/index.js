const express = require('express');
const path = require('path');
const { createServer } = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = createServer(app);
// Attach WebSocket server to the same HTTP server
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8081;

// Serve static files from the root directory (where index.html is)
// Go up one level from 'server/' to project root
const projectRoot = path.join(__dirname, '../');
app.use(express.static(projectRoot));

// Fallback to index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

const clients = new Map();

wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = Math.floor(Math.random()*16777215).toString(16);
    const metadata = { id, color };

    clients.set(ws, metadata);

    console.log(`New player connected: ${id}`);

    // Send welcome message
    ws.send(JSON.stringify({ type: 'welcome', id, color }));

    ws.on('message', (messageAsString) => {
        try {
            const message = JSON.parse(messageAsString);
            const metadata = clients.get(ws);

            message.senderId = metadata.id;
            message.senderColor = metadata.color;

            handleMessage(ws, message);
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Player disconnected: ${id}`);
        // Notify others
        broadcast({ type: 'player_left', id });
    });
});

function handleMessage(ws, message) {
    // Check for direct message target
    if (message.targetId) {
        sendTo(message.targetId, message);
        return;
    }

    switch (message.type) {
        case 'chat':
            broadcast(message);
            break;
        case 'move': // Basic movement sync
        case 'update_state': // Full state sync (hp, location, etc.)
            broadcast(message, ws); // Don't send back to sender
            break;
        case 'auth': // Player login with name
            const metadata = clients.get(ws);
            metadata.name = message.name;
            clients.set(ws, metadata);
            broadcast({ type: 'player_joined', id: metadata.id, name: message.name });
            break;
        default:
            console.log("Unknown message type:", message.type);
    }
}

function sendTo(targetId, message) {
    const data = JSON.stringify(message);
    for (const [client, metadata] of clients) {
        if (metadata.id === targetId && client.readyState === WebSocket.OPEN) {
            client.send(data);
            return;
        }
    }
}

function broadcast(message, senderWs = null) {
    const data = JSON.stringify(message);
    for (const [client, metadata] of clients) {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}

server.listen(PORT, () => {
    console.log(`Online server started on port ${PORT}`);
});
