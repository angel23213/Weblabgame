import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

// REVISA ESTOS IMPORTS (Deben tener .js)
import { pool } from './core/database.js';
import { gameManager } from './core/gameManager.js';
import { type GameType, type PlayerSymbol } from './types/game.types.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cambia esto por tu URL de Vite en producción (ej. http://localhost:5173)
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Verificación de DB (Opcional para que no detenga el servidor si falla)
async function checkDatabase() {
    try {
        await pool.query('SELECT NOW()');
        console.log("✅ DB Conectada");
    } catch (e) {
        console.log("⚠️ DB Offline (pero el servidor seguirá)");
    }
}

// Lógica de Sockets
io.on("connection", (socket) => {
    // ESTO DEBE APARECER EN TU TERMINAL
    console.log(`👤 Conectado: ${socket.id}`);

    socket.on("joinGame", ({ playerId, username, gameType }) => {
        // 1. Buscamos una sala disponible. Si no hay, creamos una nueva con ID único.
        let roomId = gameManager.findAvailableGame(gameType);
        if (!roomId) {
            roomId = `room-${gameType}-${Date.now()}`;
        }
        socket.join(roomId);

        // 2. Buscamos si ya existe una partida en esa sala
        let game = gameManager.getGame(roomId);

        const newPlayer = {
            id: playerId || socket.id,
            username: username || 'Invitado',
            socketId: socket.id,
            symbol: 'X' as PlayerSymbol
        };

        if (!game) {
            // SI NO EXISTE: Creamos la partida con el Jugador 1 (X)
            game = gameManager.createGame(roomId, gameType, [newPlayer]);
            console.log(`🎮 Partida creada: ${roomId} por ${newPlayer.username}`);
        } else {
            // SI YA EXISTE: Verificamos si hay espacio para el Jugador 2
            const isAlreadyIn = game.players.find(p => p.id === socket.id);

            if (!isAlreadyIn && game.players.length < 2) {
                newPlayer.symbol = 'O'; // Al segundo le damos la O
                game.players.push(newPlayer);
                game.status = 'playing'; // ¡AHORA SÍ CAMBIA A JUGANDO!
                console.log(`👥 ${newPlayer.username} se unió como O`);

                // IMPORTANTE: Darle sus fichas al segundo jugador de dominó
                if (gameType === 'domino') {
                    game.data.playerHands[newPlayer.id] = game.data.boneyard.splice(0, 7);
                }
            }
        }

        // 3. IMPORTANTÍSIMO: Enviamos el estado a TODA LA SALA, no solo al socket actual
        io.to(roomId).emit("gameStateUpdate", game);
    });

    // 4. ESCUCHAR MOVIMIENTOS AHORA SÍ
    socket.on("makeMove", (move) => {
        const game = gameManager.handleMove(move);
        if ("error" in game) {
            console.log(`❌ Error movimiento: ${game.error}`);
            // Podríamos emitir el error solo al usuario que lo intentó
            // socket.emit('moveError', game.error);
        } else {
            // Movimiento válido, emitimos el estado a todos en la sala
            io.to(move.gameId).emit("gameStateUpdate", game);
        }
    });

    socket.on("reconnectUser", ({ playerId }) => {
        const reconnectedGame = gameManager.reconnectPlayer(playerId, socket.id);
        if (reconnectedGame) {
            socket.join(reconnectedGame.gameId);
            io.to(reconnectedGame.gameId).emit("gameStateUpdate", reconnectedGame);
        }
    });

    socket.on("disconnect", () => {
        console.log(`🚫 Desconectado: ${socket.id}`);
        const affectedGame = gameManager.handlePlayerDisconnect(socket.id, (timedOutGame) => {
            // Callback que se ejecuta 30s después si no regresó
            io.to(timedOutGame.gameId).emit("gameStateUpdate", timedOutGame);
        });

        if (affectedGame) {
            // Le avisamos a la sala de la espera
            io.to(affectedGame.gameId).emit("gameStateUpdate", affectedGame);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await checkDatabase();
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
});