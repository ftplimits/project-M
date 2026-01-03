const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10e6, // 10MB - allow large image uploads
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

// Track active rooms
const rooms = new Map();

// Initialize room with host tracking
function initRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            host: null, // First player socket ID
            players: new Map(), // socketId -> { name, socket }
            pendingPlayers: new Map(), // socketId -> { name, socket }
            images: new Map(),
            avatars: new Map(),
            hostAvatar: null
        });
    }
    return rooms.get(roomId);
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    let currentRoom = null;
    let isAdmitted = false;

    // Check room status before joining
    socket.on('check-room-status', (data) => {
        const { roomId } = data;
        const room = initRoom(roomId);
        
        // Tell client if room has a host
        socket.emit('room-status', {
            hasHost: room.host !== null
        });
    });

    // Player requests to join
    socket.on('request-join', (data) => {
        const { roomId, playerName } = data;
        currentRoom = roomId;
        
        const room = initRoom(roomId);
        
        // First player becomes host and is auto-admitted
        if (!room.host) {
            room.host = socket.id;
            room.players.set(socket.id, { name: playerName, socket: socket });
            socket.join(roomId);
            isAdmitted = true;
            
            console.log(`${socket.id} is now host of room ${roomId}`);
            
            // Send admission confirmation
            socket.emit('admitted', {
                isHost: true,
                players: Array.from(room.players.entries()).map(([sid, p]) => ({
                    socketId: sid,
                    name: p.name
                }))
            });
        } else {
            // Subsequent players need host approval
            room.pendingPlayers.set(socket.id, { name: playerName, socket: socket });
            
            console.log(`${socket.id} requesting to join room ${roomId}`);
            
            // Notify host
            const hostSocket = room.players.get(room.host)?.socket;
            if (hostSocket) {
                hostSocket.emit('join-request', {
                    socketId: socket.id,
                    playerName: playerName
                });
            }
        }
    });
    
    // Host admits a player
    socket.on('admit-player', (data) => {
        try {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room || room.host !== socket.id) return; // Only host can admit
            
            const pendingPlayer = room.pendingPlayers.get(data.socketId);
            if (!pendingPlayer || !pendingPlayer.socket) {
                console.log(`Cannot admit ${data.socketId} - player no longer pending or socket unavailable`);
                return;
            }
            
            // Move from pending to active players
            room.players.set(data.socketId, pendingPlayer);
            room.pendingPlayers.delete(data.socketId);
            
            // Join the socket.io room
            pendingPlayer.socket.join(currentRoom);
            
            console.log(`Host admitted ${data.socketId} to room ${currentRoom}`);
            
            // Tell the player they're admitted
            pendingPlayer.socket.emit('admitted', {
                isHost: false,
                players: Array.from(room.players.entries()).map(([sid, p]) => ({
                    socketId: sid,
                    name: p.name
                }))
            });
            
            // Notify all players INCLUDING the host
            io.to(currentRoom).emit('player-joined', {
                socketId: data.socketId,
                name: pendingPlayer.name
            });
        } catch (error) {
            console.error('Error admitting player:', error);
        }
    });
    
    // Host denies a player
    socket.on('deny-player', (data) => {
        try {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room || room.host !== socket.id) return; // Only host can deny
            
            const pendingPlayer = room.pendingPlayers.get(data.socketId);
            if (!pendingPlayer) {
                console.log(`Cannot deny ${data.socketId} - player no longer pending`);
                return;
            }
            
            room.pendingPlayers.delete(data.socketId);
            
            console.log(`Host denied ${data.socketId} from room ${currentRoom}`);
            
            // Tell the player they're denied (only if socket still exists)
            if (pendingPlayer.socket) {
                pendingPlayer.socket.emit('denied');
            }
        } catch (error) {
            console.error('Error denying player:', error);
        }
    });

    // Dice rolling
    socket.on('roll-die', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all players including sender
        io.to(currentRoom).emit('dice-roll', {
            sides: data.sides,
            result: data.result,
            playerId: socket.id
        });
        
        console.log(`Player ${socket.id} rolled D${data.sides}: ${data.result}`);
    });

    // Image upload and movement
    socket.on('add-image', (data) => {
        try {
            if (!currentRoom) return;
            
            const room = rooms.get(currentRoom);
            if (room) {
                room.images.set(data.id, data);
            }
            
            // Broadcast to all other players
            console.log(`Broadcasting image ${data.id} to room ${currentRoom}, size: ${(JSON.stringify(data).length / 1024).toFixed(2)}KB`);
            socket.to(currentRoom).emit('image-added', data);
            
            console.log(`Player ${socket.id} added image ${data.id}`);
        } catch (error) {
            console.error(`Error handling add-image from ${socket.id}:`, error.message);
        }
    });

    socket.on('move-image', (data) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room && room.images.has(data.id)) {
            const img = room.images.get(data.id);
            img.x = data.x;
            img.y = data.y;
        }
        
        // Broadcast to all other players
        socket.to(currentRoom).emit('image-moved', data);
    });

    // Avatar upload and movement
    socket.on('add-avatar', (data) => {
        try {
            if (!currentRoom) return;
            
            const room = rooms.get(currentRoom);
            if (room) {
                room.avatars.set(data.id, data);
            }
            
            // Broadcast to all other players
            console.log(`Broadcasting avatar ${data.id} to room ${currentRoom}, size: ${(JSON.stringify(data).length / 1024).toFixed(2)}KB`);
            socket.to(currentRoom).emit('avatar-added', data);
            
            console.log(`Player ${socket.id} added avatar ${data.id}`);
        } catch (error) {
            console.error(`Error handling add-avatar from ${socket.id}:`, error.message);
        }
    });

    socket.on('move-avatar', (data) => {
        if (!currentRoom) return;
        
        console.log(`🎭 Avatar move from ${socket.id}: ${data.id} → (${data.normalizedX?.toFixed(3)}, ${data.normalizedY?.toFixed(3)})`);
        
        const room = rooms.get(currentRoom);
        if (room && room.avatars.has(data.id)) {
            const avatar = room.avatars.get(data.id);
            avatar.normalizedX = data.normalizedX;
            avatar.normalizedY = data.normalizedY;
        }
        
        // Broadcast to all other players
        socket.to(currentRoom).emit('avatar-moved', data);
        console.log(`  ✓ Broadcasted to room ${currentRoom}`);
    });

    // Host avatar upload handler
    socket.on('add-host-avatar', (data) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room) {
            room.hostAvatar = data.src;
        }
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('host-avatar-added', data);
        
        console.log(`Player ${socket.id} added host avatar`);
    });

    // Hotkey assignment handler
    socket.on('hotkey-assigned', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('hotkey-assigned', data);
        
        console.log(`Avatar ${data.avatarId} assigned hotkey ${data.key}`);
    });

    // Hotkey toggle handler
    socket.on('hotkey-toggled', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('hotkey-toggled', data);
        
        console.log(`Avatar ${data.avatarId} hotkey activation: ${data.enabled}`);
    });

    // Avatar activation handler
    socket.on('avatar-activated', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-activated', data);
    });

    // Avatar removal handler
    socket.on('avatar-removed', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-removed', data);
        
        console.log(`Avatar ${data.avatarId} removed`);
    });
    
    socket.on('dice-roll', (data) => {
        if (!currentRoom) return;
        
        // Broadcast dice roll to all other players in room
        socket.to(currentRoom).emit('dice-roll', data);
        
        console.log(`Dice rolled: ${data.formula} = ${data.total}`);
    });
    
    // Tactical mode handlers
    socket.on('tactical-mode-toggle', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('tactical-mode-toggle', data);
        console.log(`Tactical mode: ${data.active}`);
    });
    
    socket.on('token-added', (data) => {
        try {
            if (!currentRoom) return;
            console.log(`Broadcasting token ${data.id} to room ${currentRoom}, size: ${(JSON.stringify(data).length / 1024).toFixed(2)}KB`);
            socket.to(currentRoom).emit('token-added', data);
            console.log(`Token added: ${data.id}`);
        } catch (error) {
            console.error(`Error handling token-added from ${socket.id}:`, error.message);
        }
    });
    
    socket.on('token-moved', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-moved', data);
    });
    
    // Real-time token movement during drag (throttled at client)
    socket.on('token-moving', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-moving', data);
    });
    
    socket.on('token-removed', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-removed', data);
        console.log(`Token removed: ${data.id}`);
    });
    
    socket.on('token-hp-changed', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-hp-changed', data);
    });
    
    socket.on('token-hp-tracking-changed', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-hp-tracking-changed', data);
    });
    
    // Token condition changed handler
    socket.on('token-condition-changed', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-condition-changed', data);
        console.log(`Token ${data.id} condition changed to ${data.conditionEmoji || 'none'}`);
    });
    
    // Token size changed handler
    socket.on('token-size-changed', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-size-changed', data);
        console.log(`Token ${data.id} size changed to ${data.size}`);
    });
    
    // Avatar alternate image handler
    socket.on('avatar-alternate-set', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-alternate-set', data);
        
        console.log(`Avatar ${data.avatarId} alternate image set`);
    });
    
    // Avatar name handler
    socket.on('avatar-name-set', (data) => {
        if (!currentRoom) return;
        
        console.log(`📛 Broadcasting name from ${socket.id}: ${data.avatarId} → "${data.name}"`);
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-name-set', data);
        
        console.log(`  ✓ Broadcasted to room ${currentRoom}`);
    });
    
    // Avatar lock handler
    socket.on('avatar-lock-toggle', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-lock-toggle', data);
        
        console.log(`Avatar ${data.avatarId} lock: ${data.locked}`);
    });

    socket.on('disconnect', () => {
        try {
            console.log('Player disconnecting:', socket.id);
            
            // Remove player from all rooms
            rooms.forEach((room, roomId) => {
                try {
                    // Remove from active players
                    if (room.players && room.players.has(socket.id)) {
                        const wasHost = room.host === socket.id;
                        const playerName = room.players.get(socket.id)?.name || 'Unknown';
                        
                        room.players.delete(socket.id);
                        console.log(`  Removed ${playerName} from room ${roomId}`);
                        
                        // Notify remaining players (only if room still has players)
                        if (room.players.size > 0) {
                            try {
                                io.to(roomId).emit('player-left', {
                                    socketId: socket.id
                                });
                            } catch (broadcastError) {
                                console.error('Error broadcasting player-left:', broadcastError);
                            }
                        }
                        
                        // Handle host leaving
                        if (wasHost && room.players.size > 0) {
                            try {
                                // Transfer host to next player
                                const newHostId = room.players.keys().next().value;
                                const newHostData = room.players.get(newHostId);
                                
                                if (newHostId && newHostData) {
                                    room.host = newHostId;
                                    console.log(`  Host transferred to ${newHostData.name} (${newHostId}) in room ${roomId}`);
                                    
                                    // Notify new host
                                    if (newHostData.socket) {
                                        newHostData.socket.emit('you-are-host');
                                    }
                                    
                                    // Notify all players of host change
                                    io.to(roomId).emit('host-changed', { newHost: newHostId });
                                } else {
                                    console.error(`  Could not find new host in room ${roomId}`);
                                }
                            } catch (hostTransferError) {
                                console.error('Error transferring host:', hostTransferError);
                            }
                        }
                        
                        // Clean up empty rooms
                        if (room.players.size === 0) {
                            rooms.delete(roomId);
                            console.log(`  Room ${roomId} deleted (empty)`);
                        }
                    }
                    
                    // Remove from pending players
                    if (room.pendingPlayers && room.pendingPlayers.has(socket.id)) {
                        room.pendingPlayers.delete(socket.id);
                        console.log(`  Removed from pending players in room ${roomId}`);
                    }
                } catch (roomError) {
                    console.error(`Error cleaning up room ${roomId}:`, roomError);
                }
            });
            
            console.log('Player disconnected successfully:', socket.id);
        } catch (error) {
            console.error('CRITICAL: Error in disconnect handler:', error);
        }
    });
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    console.error('Stack:', error.stack);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise);
    console.error('Reason:', reason);
    // Don't exit - keep server running
});

io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO connection error:', err);
});

httpServer.listen(PORT, () => {
    console.log(`🎮 Monomyth VTT server running on port ${PORT}`);
    console.log(`📡 Admit/Deny system enabled`);
});
