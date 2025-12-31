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

// Track active rooms and players
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    let currentRoom = null;

    socket.on('join-room', (roomId) => {
        currentRoom = roomId;
        socket.join(roomId);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: new Set(),
                images: new Map()
            });
        }
        
        const room = rooms.get(roomId);
        room.players.add(socket.id);

        // Notify room of new player
        io.to(roomId).emit('player-joined', {
            playerId: socket.id,
            playerCount: room.players.size
        });
        
        // Send existing images to new player
        room.images.forEach((imageData, imageId) => {
            socket.emit('image-added', imageData);
        });

        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // Dice roll handler
    socket.on('dice-roll', (data) => {
        if (!currentRoom) return;
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('dice-roll', {
            ...data,
            playerId: socket.id
        });
        
        console.log(`Player ${socket.id} rolled D${data.sides}: ${data.result}`);
    });

    // Image upload handler
    socket.on('add-image', (data) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room) {
            room.images.set(data.id, data);
        }
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('image-added', data);
        
        console.log(`Player ${socket.id} added image ${data.id}`);
    });

    // Image movement handler
    socket.on('move-image', (data) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (room && room.images.has(data.id)) {
            const imageData = room.images.get(data.id);
            imageData.x = data.x;
            imageData.y = data.y;
        }
        
        // Broadcast to all other players in room
        socket.to(currentRoom).emit('image-moved', data);
    });

    socket.on('game-state', (data) => {
        // Broadcast game state to all players in room except sender
        socket.to(data.roomId).emit('game-state', data);
    });

    socket.on('disconnect', () => {
        // Remove player from all rooms
        rooms.forEach((room, roomId) => {
            if (room.players && room.players.has(socket.id)) {
                room.players.delete(socket.id);
                io.to(roomId).emit('player-left', {
                    playerId: socket.id,
                    playerCount: room.players.size
                });
                
                // Clean up empty rooms
                if (room.players.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });
        console.log('Player disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🎮 Monomyth VTT server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});
