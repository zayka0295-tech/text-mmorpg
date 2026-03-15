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

function getStablePlayerId(metadata) {
    return metadata?.dbId || metadata?.id;
}

function hasOpenConnectionForPlayer(playerId, excludedWs = null) {
    if (!playerId) return false;

    for (const [client, metadata] of clients) {
        if (client === excludedWs || client.readyState !== WebSocket.OPEN) continue;
        if (getStablePlayerId(metadata) === playerId) {
            return true;
        }
    }

    return false;
}

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
            message.senderId = getStablePlayerId(metadata);
            message.senderColor = metadata.color;
            if (metadata.name) message.senderName = metadata.name;

            await handleMessage(ws, message, metadata);
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on('close', () => {
        const metadata = clients.get(ws);
        const stablePlayerId = getStablePlayerId(metadata);
        clients.delete(ws);
        console.log(`Player disconnected: ${id} (${metadata?.name || 'anonymous'})`);
        
        if (metadata && metadata.name && !hasOpenConnectionForPlayer(stablePlayerId)) {
             // Notify others only if they were logged in
            broadcast({ type: 'player_left', id: stablePlayerId, name: metadata.name, locationId: metadata.locationId });
        }
    });
});

// Helper to send zone population
async function sendZonePopulation(ws, locationId) {
    if (!locationId) return;
    
    // 1. Get all players from DB in this location
    const { data: dbPlayers, error } = await db.getPlayersInLocation(locationId);
    
    if (error || !dbPlayers) {
        console.error('Error fetching zone population:', error);
        return;
    }

    // 2. Map to format expected by client, marking online status
    const population = dbPlayers.map(p => {
        // Check if online
        const isOnline = hasOpenConnectionForPlayer(p.id);
        
        return {
            id: p.id,
            name: p.name,
            locationId: p.locationId,
            isOnline: isOnline,
            avatar: p.avatar, // Ensure avatar is sent
            title: p.title,
            level: p.level,
            alignment: p.alignment
        };
    });

    ws.send(JSON.stringify({ 
        type: 'zone_population', 
        players: population 
    }));
}

async function handleMessage(ws, message, metadata) {
    // Only profile_data is pure pass-through. Other targetId messages need handler logic.
    if (message.type === 'profile_data' && message.targetId) {
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
                    broadcast({
                        type: 'player_joined',
                        id: getStablePlayerId(metadata),
                        name: profile.name,
                        locationId: profile.locationId,
                        avatar: profile.avatar,
                        title: profile.title,
                        level: profile.level,
                        alignment: profile.alignment,
                        isOnline: true
                    }, ws);

                    // Send population of the current zone to the user
                    await sendZonePopulation(ws, profile.locationId);
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
                    console.error('Token login error:', tokenResult.error);
                    ws.send(JSON.stringify({ type: 'login_error', message: tokenResult.error }));
                } else {
                    const profile = tokenResult.data;
                    metadata.name = profile.name;
                    metadata.isAnonymous = false;
                    metadata.dbId = profile.id;
                    clients.set(ws, metadata);
                    
                    ws.send(JSON.stringify({ type: 'login_success', profile, token: profile.sessionToken }));
                    broadcast({
                        type: 'player_joined',
                        id: getStablePlayerId(metadata),
                        name: profile.name,
                        locationId: profile.locationId,
                        avatar: profile.avatar,
                        title: profile.title,
                        level: profile.level,
                        alignment: profile.alignment,
                        isOnline: true
                    }, ws);

                    // Send population of the current zone to the user
                    await sendZonePopulation(ws, profile.locationId);
                }
            } catch (e) {
                console.error("Token login failed:", e);
                ws.send(JSON.stringify({ type: 'login_error', message: "Internal server error" }));
            }
            break;

        case 'register':
            console.log(`Register attempt for ${message.username}`);
            try {
                const regResult = await db.registerUser(message.username, message.password, message.race, message.className);
                if (regResult.error) {
                     ws.send(JSON.stringify({ type: 'register_error', message: regResult.error }));
                } else {
                    const profile = regResult.data;
                    metadata.name = profile.name;
                    metadata.isAnonymous = false;
                    metadata.dbId = profile.id;
                    clients.set(ws, metadata);
                    
                    ws.send(JSON.stringify({ type: 'register_success', profile, token: profile.sessionToken }));
                    broadcast({
                        type: 'player_joined',
                        id: getStablePlayerId(metadata),
                        name: profile.name,
                        locationId: profile.locationId,
                        avatar: profile.avatar,
                        title: profile.title,
                        level: profile.level,
                        alignment: profile.alignment,
                        isOnline: true
                    }, ws);

                    // Send population of the current zone to the user
                    await sendZonePopulation(ws, profile.locationId);
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
                
                console.log(`Saving profile for ${metadata.name}:`, { 
                    money: message.data.money, 
                    level: message.data.level, 
                    job: message.data.activeJob,
                    avatarLength: message.data.avatar ? message.data.avatar.length : 0 
                });

                await db.saveProfile(message.data);
            } catch (e) {
                console.error("Save failed:", e);
            }
            break;

        case 'chat':
            if (!metadata.isAnonymous) {
                // Add to history
                chatHistory.push(message);
                if (chatHistory.length > 50) {
                    chatHistory.shift();
                }
                broadcast(message);
            }
            break;

        case 'move': // Basic movement sync
            metadata.locationId = message.locationId; // Update server-side state
            if (!metadata.isAnonymous) {
                broadcast(message, ws);
                // When moving to a new zone, send the population of that zone to the player
                await sendZonePopulation(ws, message.locationId);
            }
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
            if (message.playerId) metadata.dbId = message.playerId;
            if (message.locationId) metadata.locationId = message.locationId;
            clients.set(ws, metadata);
            broadcast({
                type: 'player_joined',
                id: getStablePlayerId(metadata),
                name: message.name,
                locationId: metadata.locationId,
                avatar: message.avatar,
                title: message.title,
                level: message.level,
                alignment: message.alignment,
                isOnline: true
            });
            break;
            
        case 'request_profile':
             if (message.targetId || message.targetName) {
                 // If we have ID and player is online, shortcut (peer-to-peer style routing)
                 if (message.targetId && hasOpenConnectionForPlayer(message.targetId)) {
                     sendTo(message.targetId, message);
                 } else {
                     // Fallback: Fetch from DB (Offline or Missing ID)
                     try {
                         let profileResult;
                         if (message.targetId) {
                             profileResult = await db.loadProfileById(message.targetId);
                         } else if (message.targetName) {
                             profileResult = await db.loadProfile(message.targetName);
                         }

                         if (!profileResult || profileResult.error || !profileResult.data) {
                             console.error('Request profile DB fallback failed:', {
                                 targetId: message.targetId,
                                 targetName: message.targetName,
                                 error: profileResult?.error
                             });
                         } else {
                             ws.send(JSON.stringify({
                                 type: 'profile_data',
                                 senderId: profileResult.data.id, // Always send back the real UUID
                                 data: profileResult.data
                             }));
                         }
                     } catch (error) {
                         console.error('Request profile fallback exception:', {
                             targetId: message.targetId,
                             targetName: message.targetName,
                             message: error?.message,
                             stack: error?.stack
                         });
                     }
                 }
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

        case 'market_buy':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const buyRes = await db.buyItem(metadata.dbId, message.itemId, message.amount || 1);
                if (buyRes.error) {
                    ws.send(JSON.stringify({ type: 'market_result', ok: false, operation: 'buy', error: buyRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'market_result', 
                        ok: true, 
                        operation: 'buy', 
                        profile: buyRes.data,
                        itemId: message.itemId,
                        amount: message.amount || 1 
                    }));
                }
            } catch (e) {
                console.error('Market buy error:', e);
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'market_sell':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const sellRes = await db.sellItem(metadata.dbId, message.itemId, message.amount || 1);
                if (sellRes.error) {
                    ws.send(JSON.stringify({ type: 'market_result', ok: false, operation: 'sell', error: sellRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'market_result', 
                        ok: true, 
                        operation: 'sell', 
                        profile: sellRes.data,
                        itemId: message.itemId,
                        amount: message.amount || 1
                    }));
                }
            } catch (e) {
                console.error('Market sell error:', e);
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'market_buy':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const buyRes = await db.buyItem(metadata.dbId, message.itemId, message.amount || 1);
                if (buyRes.error) {
                    ws.send(JSON.stringify({ type: 'market_result', ok: false, operation: 'buy', error: buyRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'market_result', 
                        ok: true, 
                        operation: 'buy', 
                        profile: buyRes.data,
                        itemId: message.itemId,
                        amount: message.amount || 1 
                    }));
                }
            } catch (e) {
                console.error('Market buy error:', e);
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'market_sell':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const sellRes = await db.sellItem(metadata.dbId, message.itemId, message.amount || 1);
                if (sellRes.error) {
                    ws.send(JSON.stringify({ type: 'market_result', ok: false, operation: 'sell', error: sellRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'market_result', 
                        ok: true, 
                        operation: 'sell', 
                        profile: sellRes.data,
                        itemId: message.itemId,
                        amount: message.amount || 1
                    }));
                }
            } catch (e) {
                console.error('Market sell error:', e);
                ws.send(JSON.stringify({ type: 'market_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'job_start':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'job_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const startRes = await db.startJob(metadata.dbId, message.jobId);
                if (startRes.error) {
                    ws.send(JSON.stringify({ type: 'job_result', ok: false, operation: 'start', error: startRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'job_result', 
                        ok: true, 
                        operation: 'start', 
                        profile: startRes.data 
                    }));
                }
            } catch (e) {
                console.error('Job start error:', e);
                ws.send(JSON.stringify({ type: 'job_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'job_complete':
            if (metadata.isAnonymous || !metadata.dbId) {
                ws.send(JSON.stringify({ type: 'job_result', ok: false, error: 'Unauthorized' }));
                break;
            }
            try {
                const completeRes = await db.completeJob(metadata.dbId);
                if (completeRes.error) {
                    ws.send(JSON.stringify({ type: 'job_result', ok: false, operation: 'complete', error: completeRes.error }));
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'job_result', 
                        ok: true, 
                        operation: 'complete', 
                        profile: completeRes.data,
                        rewards: completeRes.rewards
                    }));
                }
            } catch (e) {
                console.error('Job complete error:', e);
                ws.send(JSON.stringify({ type: 'job_result', ok: false, error: 'Internal server error' }));
            }
            break;

        case 'reputation_vote':
            if (message.targetId) {
                const voterName = message.senderName || 'Anonymous';
                
                try {
                    if (!message.voteType || !['up', 'down'].includes(message.voteType)) {
                        ws.send(JSON.stringify({
                            type: 'reputation_vote_result',
                            ok: false,
                            targetId: message.targetId,
                            voteType: message.voteType,
                            error: 'Invalid vote type'
                        }));
                        break;
                    }

                    const result = await db.voteReputation(message.targetId, voterName, message.voteType);
                    
                    if (result.error) {
                        console.error('Reputation vote error:', {
                            error: result.error,
                            targetId: message.targetId,
                            voteType: message.voteType,
                            voterName,
                            senderId: getStablePlayerId(metadata)
                        });
                        ws.send(JSON.stringify({
                            type: 'reputation_vote_result',
                            ok: false,
                            targetId: message.targetId,
                            voteType: message.voteType,
                            error: result.error
                        }));
                    } else {
                        const { reputation, voteType } = result.data;

                        const updateMsg = {
                            type: 'reputation_update',
                            newReputation: reputation,
                            voteType: voteType,
                            voterName: voterName
                        };
                        
                        sendTo(message.targetId, updateMsg);
                        ws.send(JSON.stringify({
                            type: 'reputation_vote_result',
                            ok: true,
                            targetId: message.targetId,
                            voteType,
                            newReputation: reputation
                        }));
                    }
                } catch (e) {
                    console.error('Error processing reputation vote:', {
                        message: e?.message,
                        stack: e?.stack,
                        targetId: message.targetId,
                        voteType: message.voteType,
                        voterName,
                        senderId: getStablePlayerId(metadata)
                    });
                    ws.send(JSON.stringify({
                        type: 'reputation_vote_result',
                        ok: false,
                        targetId: message.targetId,
                        voteType: message.voteType,
                        error: 'Internal server error while processing vote'
                    }));
                }
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
        if ((metadata.dbId === targetId || metadata.id === targetId) && client.readyState === WebSocket.OPEN) {
            client.send(data);
            found = true;
            return;
        }
    }
    if (!found) {
        console.warn('sendTo target not found or offline', {
            targetId,
            messageType: message?.type
        });
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
