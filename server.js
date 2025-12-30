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

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(socket.id);

        // Notify room of new player
        io.to(roomId).emit('player-joined', {
            playerId: socket.id,
            playerCount: rooms.get(roomId).size
        });

        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    socket.on('game-state', (data) => {
        // Broadcast game state to all players in room except sender
        socket.to(data.roomId).emit('game-state', data);
    });

    socket.on('disconnect', () => {
        // Remove player from all rooms
        rooms.forEach((players, roomId) => {
            if (players.has(socket.id)) {
                players.delete(socket.id);
                io.to(roomId).emit('player-left', {
                    playerId: socket.id,
                    playerCount: players.size
                });
                
                // Clean up empty rooms
                if (players.size === 0) {
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
