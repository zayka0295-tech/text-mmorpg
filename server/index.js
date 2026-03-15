const express = require('express');
const path = require('path');
const { createServer } = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const db = require('./DatabaseService');

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
    const metadata = { id, color, isAnonymous: true };

    clients.set(ws, metadata);

    console.log(`New connection: ${id}`);

    // Send welcome message
    ws.send(JSON.stringify({ type: 'welcome', id, color }));

    ws.on('message', async (messageAsString) => {
        try {
            const message = JSON.parse(messageAsString);
            const metadata = clients.get(ws);

            // Ensure sender info is correct
            message.senderId = metadata.id;
            message.senderColor = metadata.color;
            if (metadata.name) message.senderName = metadata.name;

            await handleMessage(ws, message, metadata);
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on('close', () => {
        const metadata = clients.get(ws);
        clients.delete(ws);
        console.log(`Player disconnected: ${id} (${metadata?.name || 'anonymous'})`);
        
        if (metadata && metadata.name) {
             // Notify others only if they were logged in
            broadcast({ type: 'player_left', id: metadata.id, name: metadata.name });
        }
    });
});

async function handleMessage(ws, message, metadata) {
    // Check for direct message target
    if (message.targetId) {
        sendTo(message.targetId, message);
        return;
    }

    switch (message.type) {
        case 'login':
            console.log(`Login attempt for ${message.username}`);
            try {
                const loginResult = await db.loginUser(message.username, message.password);
                if (loginResult.error) {
                    ws.send(JSON.stringify({ type: 'login_error', message: loginResult.error }));
                } else {
                    // Success
                    const profile = loginResult.data;
                    // Update session metadata
                    metadata.name = profile.name; // Game expects 'name'
                    metadata.isAnonymous = false;
                    metadata.dbId = profile.id; // DB UUID
                    clients.set(ws, metadata);
                    
                    // Send session token back to client
                    ws.send(JSON.stringify({ type: 'login_success', profile, token: profile.sessionToken }));
                    
                    // Broadcast join
                    broadcast({ type: 'player_joined', id: metadata.id, name: profile.name }, ws);

                    // Send existing online players to the new user
                    for (const [otherWs, otherMeta] of clients) {
                        if (otherWs !== ws && otherMeta.name && !otherMeta.isAnonymous) {
                            ws.send(JSON.stringify({
                                type: 'player_joined',
                                id: otherMeta.id,
                                name: otherMeta.name,
                                locationId: otherMeta.locationId || 'tatooine_spaceport'
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error("Login failed:", e);
                ws.send(JSON.stringify({ type: 'login_error', message: "Internal server error" }));
            }
            break;

        case 'login_token':
            console.log(`Token login attempt`);
            try {
                const tokenResult = await db.loginWithToken(message.token);
                if (tokenResult.error) {
                    ws.send(JSON.stringify({ type: 'login_error', message: "Session expired" }));
                } else {
                    const profile = tokenResult.data;
                    metadata.name = profile.name;
                    metadata.isAnonymous = false;
                    metadata.dbId = profile.id;
                    clients.set(ws, metadata);
                    
                    ws.send(JSON.stringify({ type: 'login_success', profile, token: profile.sessionToken }));
                    broadcast({ type: 'player_joined', id: metadata.id, name: profile.name }, ws);

                    for (const [otherWs, otherMeta] of clients) {
                        if (otherWs !== ws && otherMeta.name && !otherMeta.isAnonymous) {
                            ws.send(JSON.stringify({
                                type: 'player_joined',
                                id: otherMeta.id,
                                name: otherMeta.name,
                                locationId: otherMeta.locationId || 'tatooine_spaceport'
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error("Token login failed:", e);
                ws.send(JSON.stringify({ type: 'login_error', message: "Internal server error" }));
            }
            break;

        case 'register':
            console.log(`Register attempt for ${message.username}`);
            try {
                const regResult = await db.registerUser(message.username, message.password);
                if (regResult.error) {
                     ws.send(JSON.stringify({ type: 'register_error', message: regResult.error }));
                } else {
                    const profile = regResult.data;
                    metadata.name = profile.name;
                    metadata.isAnonymous = false;
                    metadata.dbId = profile.id;
                    clients.set(ws, metadata);
                    
                    ws.send(JSON.stringify({ type: 'register_success', profile }));
                    broadcast({ type: 'player_joined', id: metadata.id, name: profile.name }, ws);

                    // Send existing online players to the new user
                    for (const [otherWs, otherMeta] of clients) {
                        if (otherWs !== ws && otherMeta.name && !otherMeta.isAnonymous) {
                            ws.send(JSON.stringify({
                                type: 'player_joined',
                                id: otherMeta.id,
                                name: otherMeta.name,
                                locationId: otherMeta.locationId || 'tatooine_spaceport'
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error("Register failed:", e);
                ws.send(JSON.stringify({ type: 'register_error', message: "Internal server error" }));
            }
            break;

        case 'save_profile':
            if (metadata.isAnonymous) return;
            try {
                // Merge ID from DB if needed, or trust client? 
                // Better to override ID with the one from DB to be safe, but we use the one passed in mostly.
                // Actually, DatabaseService.saveProfile expects the game data object.
                // Ensure we don't overwrite someone else's data if client spoofs ID.
                if (message.data.name !== metadata.name) {
                    console.warn(`Player ${metadata.name} tried to save as ${message.data.name}`);
                    return;
                }
                // Inject the DB ID to ensure upsert works correctly
                if (metadata.dbId) message.data.id = metadata.dbId;
                
                await db.saveProfile(message.data);
            } catch (e) {
                console.error("Save failed:", e);
            }
            break;

        case 'chat':
            if (!metadata.isAnonymous) broadcast(message);
            break;

        case 'move': // Basic movement sync
            metadata.locationId = message.locationId; // Update server-side state
            if (!metadata.isAnonymous) broadcast(message, ws);
            break;

        case 'update_state': // Full state sync (hp, location, etc.)
            if (!metadata.isAnonymous) broadcast(message, ws);
            break;

        // Legacy auth (if we still want to support name-only login without password for testing?)
        // Let's keep it for now but maybe disable if DB is active?
        // Or just allow it as "Guest" mode.
        case 'auth': 
            metadata.name = message.name;
            metadata.isAnonymous = false;
            clients.set(ws, metadata);
            broadcast({ type: 'player_joined', id: metadata.id, name: message.name });
            break;
            
        case 'request_profile':
             // If requesting profile of someone in DB but not online? 
             // Currently ZonePlayers only shows online. 
             // But if we want offline inspect, we could implement db.loadProfile here.
             // For now, let's keep it peer-to-peer if online.
             if (message.targetId) {
                 sendTo(message.targetId, message);
             }
             break;

        case 'combat_result':
            if (message.targetId) {
                sendTo(message.targetId, message);
            }
            break;

        case 'rob_result':
            if (message.targetId) {
                sendTo(message.targetId, message);
            }
            break;

        default:
            console.log("Unknown message type:", message.type);
    }
}

function sendTo(targetId, message) {
    const data = JSON.stringify(message);
    let found = false;
    for (const [client, metadata] of clients) {
        if (metadata.id === targetId && client.readyState === WebSocket.OPEN) {
            client.send(data);
            found = true;
            return;
        }
    }
    if (!found) {
        // Handle offline message or not found
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
