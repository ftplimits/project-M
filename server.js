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
    }
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
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.host !== socket.id) return; // Only host can admit
        
        const pendingPlayer = room.pendingPlayers.get(data.socketId);
        if (!pendingPlayer) return;
        
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
    });
    
    // Host denies a player
    socket.on('deny-player', (data) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.host !== socket.id) return; // Only host can deny
        
        const pendingPlayer = room.pendingPlayers.get(data.socketId);
        if (!pendingPlayer) return;
        
        room.pendingPlayers.delete(data.socketId);
        
        console.log(`Host denied ${data.socketId} from room ${currentRoom}`);
        
        // Tell the player they're denied
        pendingPlayer.socket.emit('denied');
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
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room) {
            room.images.set(data.id, data);
        }
        
        // Broadcast to all other players
        socket.to(currentRoom).emit('image-added', data);
        
        console.log(`Player ${socket.id} added image ${data.id}`);
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
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room) {
            room.avatars.set(data.id, data);
        }
        
        // Broadcast to all other players
        socket.to(currentRoom).emit('avatar-added', data);
        
        console.log(`Player ${socket.id} added avatar ${data.id}`);
    });

    socket.on('move-avatar', (data) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room && room.avatars.has(data.id)) {
            const avatar = room.avatars.get(data.id);
            avatar.x = data.x;
            avatar.y = data.y;
        }
        
        // Broadcast to all other players
        socket.to(currentRoom).emit('avatar-moved', data);
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
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-added', data);
        console.log(`Token added: ${data.id}`);
    });
    
    socket.on('token-moved', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('token-moved', data);
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
    
    // Avatar flip handler
    socket.on('avatar-flipped', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-flipped', data);
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
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-name-set', data);
        
        console.log(`Avatar ${data.avatarId} named: ${data.name}`);
    });
    
    // Avatar lock handler
    socket.on('avatar-lock-toggle', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('avatar-lock-toggle', data);
        
        console.log(`Avatar ${data.avatarId} lock: ${data.locked}`);
    });

    socket.on('disconnect', () => {
        // Remove player from all rooms
        rooms.forEach((room, roomId) => {
            // Remove from active players
            if (room.players && room.players.has(socket.id)) {
                const wasHost = room.host === socket.id;
                room.players.delete(socket.id);
                
                // Notify remaining players
                io.to(roomId).emit('player-left', {
                    socketId: socket.id
                });
                
                // Handle host leaving
                if (wasHost && room.players.size > 0) {
                    // Transfer host to next player
                    const newHost = room.players.keys().next().value;
                    room.host = newHost;
                    console.log(`Host transferred to ${newHost} in room ${roomId}`);
                    
                    // Notify new host
                    const newHostSocket = room.players.get(newHost)?.socket;
                    if (newHostSocket) {
                        newHostSocket.emit('you-are-host');
                        // Mark them as host
                        io.to(roomId).emit('host-changed', { newHost: newHost });
                    }
                }
                
                // Clean up empty rooms
                if (room.players.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                }
            }
            
            // Remove from pending players
            if (room.pendingPlayers && room.pendingPlayers.has(socket.id)) {
                room.pendingPlayers.delete(socket.id);
            }
        });
        console.log('Player disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🎮 Monomyth VTT server running on port ${PORT}`);
    console.log(`📡 Admit/Deny system enabled`);
});
